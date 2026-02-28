import assert from "node:assert/strict";
import test from "node:test";
import { mulawToPcm16 } from "../src/audio/mulaw.js";
import { wavFromPcm16le } from "../src/audio/wav.js";

test("mulawToPcm16 decodes silence-ish values", () => {
  const pcm = mulawToPcm16(Uint8Array.from([0xff, 0x7f]));
  assert.equal(pcm.length, 2);
  // Both are commonly used as silence in PCMU streams (sign bit differs); both should decode near zero.
  assert.ok(Math.abs(pcm[0] ?? 0) < 20);
  assert.ok(Math.abs(pcm[1] ?? 0) < 20);
});

test("wavFromPcm16le creates a valid RIFF header", () => {
  const pcm = new Int16Array([0, 1, -1, 32767, -32768]);
  const wav = wavFromPcm16le(pcm, 8000);
  assert.equal(wav.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(wav.subarray(8, 12).toString("ascii"), "WAVE");
  assert.equal(wav.subarray(12, 16).toString("ascii"), "fmt ");
  assert.equal(wav.subarray(36, 40).toString("ascii"), "data");
  assert.equal(wav.length, 44 + pcm.length * 2);
});
