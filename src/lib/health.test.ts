import { describe, expect, it } from "vitest";

import { computeHealth, type HealthInput } from "./health";

const NOW = new Date("2026-07-21T00:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86400000);

const base: HealthInput = {
  active: true,
  records: 0,
  users: 0,
  invoices: 0,
  lastActivityAt: null,
  now: NOW,
};

describe("computeHealth", () => {
  it("marks a suspended company as suspended with score 0", () => {
    const h = computeHealth({ ...base, active: false, records: 100, users: 10, invoices: 5, lastActivityAt: NOW });
    expect(h.tier).toBe("suspended");
    expect(h.score).toBe(0);
  });

  it("scores a thriving, recently-active company as healthy", () => {
    const h = computeHealth({
      ...base,
      records: 50,
      users: 5,
      invoices: 8,
      lastActivityAt: daysAgo(2),
    });
    // 30 (records) + 40 (≤7d) + 15 (≥3 users) + 15 (invoices) = 100
    expect(h.score).toBe(100);
    expect(h.tier).toBe("healthy");
  });

  it("treats a brand-new empty company as at risk", () => {
    const h = computeHealth(base);
    expect(h.score).toBe(0);
    expect(h.tier).toBe("at_risk");
  });

  it("falls to a lower recency bucket as activity ages", () => {
    const recent = computeHealth({ ...base, records: 5, users: 1, lastActivityAt: daysAgo(3) });
    const stale = computeHealth({ ...base, records: 5, users: 1, lastActivityAt: daysAgo(60) });
    expect(recent.score).toBeGreaterThan(stale.score);
  });

  it("caps the score at 100", () => {
    const h = computeHealth({
      ...base,
      records: 999,
      users: 99,
      invoices: 99,
      lastActivityAt: daysAgo(1),
    });
    expect(h.score).toBeLessThanOrEqual(100);
  });
});
