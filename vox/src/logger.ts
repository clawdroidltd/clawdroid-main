import fs from "node:fs";
import path from "node:path";
import { jsonLine } from "./json.js";

export type CallLogger = {
  dir: string;
  event: (source: "twilio" | "openai" | "vox", payload: unknown) => void;
  close: () => void;
};

export function createCallLogger(baseDir: string, id: string): CallLogger {
  const dir = path.join(baseDir, id);
  fs.mkdirSync(dir, { recursive: true });
  const stream = fs.createWriteStream(path.join(dir, "events.jsonl"), { flags: "a" });

  const event = (source: "twilio" | "openai" | "vox", payload: unknown) => {
    stream.write(
      jsonLine({
        t: new Date().toISOString(),
        source,
        payload,
      }),
    );
  };

  const close = () => stream.end();

  return { dir, event, close };
}
