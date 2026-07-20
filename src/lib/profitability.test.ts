import { describe, expect, it } from "vitest";

import { computeProfitability } from "./profitability";

describe("computeProfitability", () => {
  it("sums cost buckets and derives margin + percent", () => {
    const p = computeProfitability({ revenue: 1000, labor: 300, materials: 150, expenses: 50 });
    expect(p.cost).toBe(500);
    expect(p.margin).toBe(500);
    expect(p.marginPct).toBe(50);
  });

  it("returns a negative margin when costs exceed revenue", () => {
    const p = computeProfitability({ revenue: 200, labor: 300, materials: 0, expenses: 0 });
    expect(p.cost).toBe(300);
    expect(p.margin).toBe(-100);
    expect(p.marginPct).toBe(-50);
  });

  it("leaves marginPct null when revenue is zero", () => {
    const p = computeProfitability({ revenue: 0, labor: 120, materials: 0, expenses: 0 });
    expect(p.margin).toBe(-120);
    expect(p.marginPct).toBeNull();
  });

  it("rounds to cents and floors negatives to zero", () => {
    const p = computeProfitability({ revenue: 99.999, labor: -5, materials: 10.005, expenses: 0 });
    expect(p.revenue).toBe(100);
    expect(p.labor).toBe(0);
    expect(p.materials).toBe(10.01);
    expect(p.cost).toBe(10.01);
    expect(p.margin).toBe(89.99);
  });
});
