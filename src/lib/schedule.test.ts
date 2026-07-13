import { describe, expect, it } from "vitest";

import { addUtcDays, dayKey, startOfUtcDay, utcDay, weekRange } from "@/lib/schedule";

describe("schedule date math", () => {
  it("builds a UTC-midnight day regardless of local timezone", () => {
    const d = utcDay(2026, 6, 14); // 2026-07-14
    expect(d.toISOString()).toBe("2026-07-14T00:00:00.000Z");
  });

  it("normalizes any instant to the start of its UTC day", () => {
    const d = startOfUtcDay(new Date("2026-07-14T18:45:00.000Z"));
    expect(d.toISOString()).toBe("2026-07-14T00:00:00.000Z");
  });

  it("adds whole days across a month boundary", () => {
    expect(dayKey(addUtcDays(utcDay(2026, 6, 30), 3))).toBe("2026-08-02");
  });

  it("subtracts days for negative offsets", () => {
    expect(dayKey(addUtcDays(utcDay(2026, 6, 1), -1))).toBe("2026-06-30");
  });

  it("returns a Monday..Sunday week for a midweek day", () => {
    // 2026-07-14 is a Tuesday; the week runs Mon 13 .. Sun 19 (exclusive Mon 20).
    const { from, to } = weekRange(new Date("2026-07-14T09:00:00.000Z"));
    expect(dayKey(from)).toBe("2026-07-13");
    expect(dayKey(to)).toBe("2026-07-20");
  });

  it("keeps a Monday in its own week", () => {
    const { from, to } = weekRange(utcDay(2026, 6, 13)); // Monday
    expect(dayKey(from)).toBe("2026-07-13");
    expect(dayKey(to)).toBe("2026-07-20");
  });

  it("treats Sunday as the last day of the Monday-first week", () => {
    const { from, to } = weekRange(utcDay(2026, 6, 19)); // Sunday
    expect(dayKey(from)).toBe("2026-07-13");
    expect(dayKey(to)).toBe("2026-07-20");
  });
});
