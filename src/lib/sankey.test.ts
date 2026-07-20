import { describe, expect, it } from "vitest";

import { buildMoneyFlow } from "./sankey";

describe("buildMoneyFlow", () => {
  it("splits revenue into cost buckets plus leftover profit", () => {
    const m = buildMoneyFlow({ revenue: 1000, labor: 400, materials: 100, expenses: 100 });
    expect(m.loss).toBe(false);
    const byKey = Object.fromEntries(m.flows.map((f) => [f.key, f.value]));
    expect(byKey.profit).toBe(400);
    // Shares are fractions of revenue and sum to 1.
    const shareSum = m.flows.reduce((s, f) => s + f.share, 0);
    expect(shareSum).toBeCloseTo(1, 6);
    expect(m.flows.find((f) => f.key === "labor")!.share).toBeCloseTo(0.4, 6);
  });

  it("drops zero buckets", () => {
    const m = buildMoneyFlow({ revenue: 500, labor: 500, materials: 0, expenses: 0 });
    expect(m.flows.map((f) => f.key)).toEqual(["labor"]);
  });

  it("flags a loss and sizes ribbons against total cost", () => {
    const m = buildMoneyFlow({ revenue: 300, labor: 400, materials: 100, expenses: 100 });
    expect(m.loss).toBe(true);
    // No profit flow in a loss.
    expect(m.flows.find((f) => f.key === "profit")).toBeUndefined();
    // Shares still fill the bar (sum to 1 against cost).
    expect(m.flows.reduce((s, f) => s + f.share, 0)).toBeCloseTo(1, 6);
  });

  it("returns nothing when there's no revenue", () => {
    expect(buildMoneyFlow({ revenue: 0, labor: 0, materials: 0, expenses: 0 }).flows).toHaveLength(0);
  });
});
