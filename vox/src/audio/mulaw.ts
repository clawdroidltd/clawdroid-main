export function mulawToPcm16(input: Uint8Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    out[i] = decodeMulawSample(input[i] ?? 0);
  }
  return out;
}

// G.711 μ-law (PCMU) 8-bit to 16-bit linear PCM.
// Reference implementation derived from the standard μ-law expansion equation.
function decodeMulawSample(uLawByte: number): number {
  const u = ~uLawByte & 0xff;
  const sign = u & 0x80;
  const exponent = (u >> 4) & 0x07;
  const mantissa = u & 0x0f;
  let sample = ((mantissa << 3) + 0x84) << exponent;
  sample -= 0x84;
  return (sign ? -sample : sample) as number;
}
