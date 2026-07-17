import { describe, expect, it } from "vitest";

import { isValidTimeZone, zonedWallTimeToUtc } from "@/lib/timezone";

describe("zonedWallTimeToUtc", () => {
  it("treats UTC wall time as the same instant", () => {
    expect(zonedWallTimeToUtc(2026, 7, 15, 9, 0, "UTC").toISOString()).toBe(
      "2026-07-15T09:00:00.000Z"
    );
  });

  it("applies a summer (DST) offset for New York", () => {
    // July → EDT (UTC−4): 09:00 local is 13:00 UTC.
    expect(zonedWallTimeToUtc(2026, 7, 15, 9, 0, "America/New_York").toISOString()).toBe(
      "2026-07-15T13:00:00.000Z"
    );
  });

  it("applies a winter (standard) offset for New York", () => {
    // January → EST (UTC−5): 09:00 local is 14:00 UTC.
    expect(zonedWallTimeToUtc(2026, 1, 15, 9, 0, "America/New_York").toISOString()).toBe(
      "2026-01-15T14:00:00.000Z"
    );
  });

  it("applies the Pacific summer offset", () => {
    // July → PDT (UTC−7): 09:00 local is 16:00 UTC.
    expect(zonedWallTimeToUtc(2026, 7, 15, 9, 0, "America/Los_Angeles").toISOString()).toBe(
      "2026-07-15T16:00:00.000Z"
    );
  });

  it("falls back to UTC for an unknown zone", () => {
    expect(zonedWallTimeToUtc(2026, 7, 15, 9, 0, "Not/AZone").toISOString()).toBe(
      "2026-07-15T09:00:00.000Z"
    );
  });
});

describe("isValidTimeZone", () => {
  it("accepts real IANA zones", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("UTC")).toBe(true);
  });

  it("rejects made-up zones", () => {
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });
});
