import { describe, expect, it } from "vitest";

import { formatTime, formatTimeRange } from "@/lib/format";

describe("formatTime", () => {
  it("formats morning times with AM", () => {
    expect(formatTime("09:05")).toBe("9:05 AM");
  });

  it("formats noon as 12 PM", () => {
    expect(formatTime("12:00")).toBe("12:00 PM");
  });

  it("formats midnight as 12 AM", () => {
    expect(formatTime("00:00")).toBe("12:00 AM");
  });

  it("formats afternoon times with PM", () => {
    expect(formatTime("17:30")).toBe("5:30 PM");
  });

  it("returns the raw value when it can't be parsed", () => {
    expect(formatTime("not-a-time")).toBe("not-a-time");
  });

  it("formats in 24-hour form when asked, zero-padding the hour", () => {
    expect(formatTime("09:05", true)).toBe("09:05");
    expect(formatTime("17:30", true)).toBe("17:30");
    expect(formatTime("00:00", true)).toBe("00:00");
  });
});

describe("formatTimeRange", () => {
  it("joins start and end with an en dash", () => {
    expect(formatTimeRange("09:00", "11:30")).toBe("9:00 AM–11:30 AM");
    expect(formatTimeRange("09:00", "11:30", true)).toBe("09:00–11:30");
  });

  it("shows only the start when there is no end", () => {
    expect(formatTimeRange("14:00", null)).toBe("2:00 PM");
  });

  it("falls back to the given label when there is no start", () => {
    expect(formatTimeRange(null, null, false, "All day")).toBe("All day");
    expect(formatTimeRange(null, null)).toBe("");
  });
});
