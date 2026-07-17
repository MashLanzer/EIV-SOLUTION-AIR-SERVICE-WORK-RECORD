import { describe, expect, it } from "vitest";

import { financialRange, normalizeFinancialPeriod } from "@/lib/financials";

const iso = (d: Date) => d.toISOString();
// A fixed "now": 2026-05-17 (a Q2 month), UTC.
const NOW = new Date("2026-05-17T12:00:00.000Z");

describe("normalizeFinancialPeriod", () => {
  it("passes through valid periods", () => {
    expect(normalizeFinancialPeriod("year")).toBe("year");
    expect(normalizeFinancialPeriod("quarter")).toBe("quarter");
    expect(normalizeFinancialPeriod("last_month")).toBe("last_month");
  });

  it("defaults to month for missing or unknown input", () => {
    expect(normalizeFinancialPeriod(undefined)).toBe("month");
    expect(normalizeFinancialPeriod(null)).toBe("month");
    expect(normalizeFinancialPeriod("bogus")).toBe("month");
  });
});

describe("financialRange", () => {
  it("this month is [1st, 1st of next month)", () => {
    const r = financialRange("month", NOW);
    expect(iso(r.start)).toBe("2026-05-01T00:00:00.000Z");
    expect(iso(r.end)).toBe("2026-06-01T00:00:00.000Z");
  });

  it("last month is the previous calendar month", () => {
    const r = financialRange("last_month", NOW);
    expect(iso(r.start)).toBe("2026-04-01T00:00:00.000Z");
    expect(iso(r.end)).toBe("2026-05-01T00:00:00.000Z");
  });

  it("quarter covers the containing 3-month quarter (Q2 = Apr–Jun)", () => {
    const r = financialRange("quarter", NOW);
    expect(iso(r.start)).toBe("2026-04-01T00:00:00.000Z");
    expect(iso(r.end)).toBe("2026-07-01T00:00:00.000Z");
  });

  it("year is Jan 1 to Jan 1 next year", () => {
    const r = financialRange("year", NOW);
    expect(iso(r.start)).toBe("2026-01-01T00:00:00.000Z");
    expect(iso(r.end)).toBe("2027-01-01T00:00:00.000Z");
  });

  it("last month rolls over the year boundary in January", () => {
    const jan = new Date("2026-01-10T00:00:00.000Z");
    const r = financialRange("last_month", jan);
    expect(iso(r.start)).toBe("2025-12-01T00:00:00.000Z");
    expect(iso(r.end)).toBe("2026-01-01T00:00:00.000Z");
  });
});
