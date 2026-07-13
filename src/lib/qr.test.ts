import { describe, expect, it } from "vitest";

import {
  encodeQr,
  gfMul,
  getAlignmentPatternPositions,
  getNumRawDataModules,
  qrToSvg,
  readInterleavedForTest,
  reedSolomonComputeDivisor,
  reedSolomonRemainder,
  type QrResult,
} from "./qr";

// Concatenate each block's data codewords (pre-interleave order) and parse the
// byte-mode payload back into the original string.
function decodePayload(result: QrResult): string {
  const data = result.blocks.flatMap((b) => b.data);
  const bits: number[] = [];
  for (const byte of data) for (let i = 7; i >= 0; i--) bits.push((byte >>> i) & 1);
  let pos = 0;
  const read = (n: number) => {
    let v = 0;
    for (let i = 0; i < n; i++) v = (v << 1) | bits[pos++];
    return v;
  };
  const mode = read(4);
  expect(mode).toBe(0b0100); // byte mode
  const len = read(result.version <= 9 ? 8 : 16);
  const out: number[] = [];
  for (let i = 0; i < len; i++) out.push(read(8));
  return new TextDecoder().decode(new Uint8Array(out));
}

describe("Galois field", () => {
  it("multiplies with known values", () => {
    expect(gfMul(0, 5)).toBe(0);
    expect(gfMul(1, 1)).toBe(1);
    // In GF(256) with 0x11D, a^1 * a^1 = a^2 = 4, and 0x02*0x87 wraps via 0x11D.
    expect(gfMul(2, 2)).toBe(4);
    expect(gfMul(2, 128)).toBe(0x1d); // 256 wraps to the primitive polynomial's low byte
  });
});

describe("version tables", () => {
  it("raw data module counts match the spec (v1..v10)", () => {
    const expected = [208, 359, 567, 807, 1079, 1383, 1568, 1936, 2336, 2768];
    for (let v = 1; v <= 10; v++) expect(getNumRawDataModules(v)).toBe(expected[v - 1]);
  });

  it("alignment pattern positions match the spec", () => {
    expect(getAlignmentPatternPositions(1)).toEqual([]);
    expect(getAlignmentPatternPositions(2)).toEqual([6, 18]);
    expect(getAlignmentPatternPositions(7)).toEqual([6, 22, 38]);
    expect(getAlignmentPatternPositions(10)).toEqual([6, 28, 50]);
  });
});

describe("Reed-Solomon", () => {
  it("produces a zero remainder when dividing the encoded message", () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
    const divisor = reedSolomonComputeDivisor(10);
    const ec = Array.from(reedSolomonRemainder(data, divisor));
    // The codeword (data + ec) must divide the generator exactly - re-dividing
    // the full codeword yields an all-zero remainder (syndromes are zero).
    const check = reedSolomonRemainder([...data, ...ec], divisor);
    expect(Array.from(check)).toEqual(new Array(10).fill(0));
  });
});

describe("encodeQr", () => {
  const samples = [
    "HELLO",
    "https://example.com/receipt/abcdef0123456789",
    "https://aerotrack.app/receipt/" + "a".repeat(120),
  ];

  for (const text of samples) {
    it(`round-trips "${text.slice(0, 24)}${text.length > 24 ? "…" : ""}"`, () => {
      const result = encodeQr(text);

      // Square matrix of the right dimension.
      expect(result.size).toBe(result.version * 4 + 17);
      expect(result.modules.length).toBe(result.size);
      expect(result.modules.every((row) => row.length === result.size)).toBe(true);

      // Every block's Reed-Solomon syndromes are zero (valid EC).
      for (const block of result.blocks) {
        const divisor = reedSolomonComputeDivisor(block.ec.length);
        const check = reedSolomonRemainder([...block.data, ...block.ec], divisor);
        expect(Array.from(check)).toEqual(new Array(block.ec.length).fill(0));
      }

      // Reading the drawn+masked matrix back yields exactly the interleaved
      // stream we placed (proves zigzag placement + mask are consistent).
      expect(readInterleavedForTest(result)).toEqual(result.interleaved);

      // The payload decodes to the original text.
      expect(decodePayload(result)).toBe(text);
    });
  }

  it("has correct finder patterns at all three corners", () => {
    const { modules, size } = encodeQr("test");
    const corners: [number, number][] = [
      [0, 0],
      [size - 7, 0],
      [0, size - 7],
    ];
    for (const [ox, oy] of corners) {
      for (let dy = 0; dy < 7; dy++) {
        for (let dx = 0; dx < 7; dx++) {
          const onBorder = dx === 0 || dx === 6 || dy === 0 || dy === 6;
          const inCenter = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
          expect(modules[oy + dy][ox + dx]).toBe(onBorder || inCenter);
        }
      }
    }
  });

  it("has an alternating timing pattern", () => {
    const { modules, size } = encodeQr("test");
    for (let i = 8; i < size - 8; i++) {
      expect(modules[6][i]).toBe(i % 2 === 0);
      expect(modules[i][6]).toBe(i % 2 === 0);
    }
  });

  it("picks the smallest version that fits", () => {
    expect(encodeQr("a".repeat(14)).version).toBe(1);
    expect(encodeQr("a".repeat(15)).version).toBe(2);
    expect(encodeQr("a".repeat(213)).version).toBe(10);
  });

  it("throws when the data exceeds version 10 capacity", () => {
    expect(() => encodeQr("a".repeat(214))).toThrow();
  });
});

describe("qrToSvg", () => {
  it("returns a self-contained svg with the requested size", () => {
    const svg = qrToSvg("https://example.com/receipt/xyz", { pixels: 200 });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('width="200"');
    expect(svg).toContain("</svg>");
    expect(svg).not.toContain("http://www.w3.org/1999/xlink");
  });
});
