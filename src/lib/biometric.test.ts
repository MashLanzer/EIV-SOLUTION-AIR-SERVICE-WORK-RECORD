import { describe, expect, it } from "vitest";

import { fromBase64Url, shouldLock, toBase64Url } from "./biometric";

describe("base64url", () => {
  it("round-trips arbitrary bytes without padding chars", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255, 62, 63]);
    const encoded = toBase64Url(bytes);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(Array.from(fromBase64Url(encoded))).toEqual(Array.from(bytes));
  });

  it("handles every length modulo 4", () => {
    for (let n = 0; n < 8; n++) {
      const bytes = new Uint8Array(Array.from({ length: n }, (_, i) => (i * 37) % 256));
      expect(Array.from(fromBase64Url(toBase64Url(bytes)))).toEqual(Array.from(bytes));
    }
  });
});

describe("shouldLock", () => {
  it("locks only when enabled and not yet unlocked", () => {
    expect(shouldLock(true, false)).toBe(true);
    expect(shouldLock(true, true)).toBe(false);
    expect(shouldLock(false, false)).toBe(false);
    expect(shouldLock(false, true)).toBe(false);
  });
});
