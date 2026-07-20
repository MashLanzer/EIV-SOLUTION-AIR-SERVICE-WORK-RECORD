import { describe, expect, it } from "vitest";

import { normalizeViewMode } from "./viewMode";

describe("normalizeViewMode", () => {
  it("returns grid only for the exact 'grid' value", () => {
    expect(normalizeViewMode("grid")).toBe("grid");
  });

  it("falls back to list for anything else", () => {
    expect(normalizeViewMode("list")).toBe("list");
    expect(normalizeViewMode(null)).toBe("list");
    expect(normalizeViewMode(undefined)).toBe("list");
    expect(normalizeViewMode("GRID")).toBe("list");
  });
});
