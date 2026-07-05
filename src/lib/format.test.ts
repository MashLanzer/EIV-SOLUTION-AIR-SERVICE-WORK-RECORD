import { describe, expect, it } from "vitest";

import { formatTime } from "@/lib/format";

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
});
