import { describe, expect, it } from "vitest";

import {
  addUtcDays,
  dayKey,
  monthGridDays,
  monthRange,
  startOfUtcDay,
  timeWindowsOverlap,
  toMinutes,
  utcDay,
  weekRange,
} from "@/lib/schedule";

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

  it("starts the week on Sunday when weekStartsOn is 0", () => {
    // 2026-07-14 is a Tuesday; a Sunday-first week runs Sun 12 .. Sat 18.
    const { from, to } = weekRange(utcDay(2026, 6, 14), 0);
    expect(dayKey(from)).toBe("2026-07-12");
    expect(dayKey(to)).toBe("2026-07-19");
  });
});

describe("monthRange", () => {
  it("spans the first of the month to the first of the next", () => {
    const { from, to } = monthRange(new Date("2026-07-14T09:00:00.000Z"));
    expect(dayKey(from)).toBe("2026-07-01");
    expect(dayKey(to)).toBe("2026-08-01");
  });

  it("rolls the year over in December", () => {
    const { from, to } = monthRange(utcDay(2026, 11, 15)); // Dec 2026
    expect(dayKey(from)).toBe("2026-12-01");
    expect(dayKey(to)).toBe("2027-01-01");
  });
});

describe("monthGridDays", () => {
  it("returns a 42-day grid starting on the Monday before the 1st", () => {
    const days = monthGridDays(utcDay(2026, 6, 14)); // July 2026 (1st is Wed)
    expect(days).toHaveLength(42);
    expect(dayKey(days[0])).toBe("2026-06-29"); // Monday
    expect(dayKey(days[41])).toBe("2026-08-09");
  });

  it("starts on the 1st when the month begins on a Monday", () => {
    const days = monthGridDays(utcDay(2026, 5, 10)); // June 2026 (1st is Monday)
    expect(dayKey(days[0])).toBe("2026-06-01");
  });

  it("starts the grid on the Sunday before the 1st when weekStartsOn is 0", () => {
    const days = monthGridDays(utcDay(2026, 6, 14), 0); // July 2026 (1st is Wed)
    expect(days).toHaveLength(42);
    expect(dayKey(days[0])).toBe("2026-06-28"); // Sunday
  });
});

describe("toMinutes", () => {
  it("parses HH:MM to minutes since midnight", () => {
    expect(toMinutes("09:30")).toBe(570);
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("23:59")).toBe(1439);
  });

  it("returns null for empty or malformed input", () => {
    expect(toMinutes(null)).toBeNull();
    expect(toMinutes("")).toBeNull();
    expect(toMinutes("nope")).toBeNull();
    expect(toMinutes("24:00")).toBeNull();
  });
});

describe("timeWindowsOverlap", () => {
  it("flags two overlapping windows", () => {
    expect(timeWindowsOverlap("09:00", "11:00", "10:00", "12:00")).toBe(true);
  });

  it("does not flag back-to-back windows (end == next start)", () => {
    expect(timeWindowsOverlap("09:00", "10:00", "10:00", "11:00")).toBe(false);
  });

  it("does not flag windows on either side", () => {
    expect(timeWindowsOverlap("09:00", "10:00", "13:00", "14:00")).toBe(false);
  });

  it("never flags when a start time is missing (can't tell)", () => {
    expect(timeWindowsOverlap(null, null, "09:00", "10:00")).toBe(false);
    expect(timeWindowsOverlap("09:00", "10:00", null, null)).toBe(false);
  });

  it("treats a start with no end as a zero-length point (no clash)", () => {
    expect(timeWindowsOverlap("09:00", null, "09:00", null)).toBe(false);
  });

  it("flags a point that falls inside another window", () => {
    expect(timeWindowsOverlap("09:30", null, "09:00", "10:00")).toBe(true);
  });
});
