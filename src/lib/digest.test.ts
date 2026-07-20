import { describe, expect, it } from "vitest";

import { buildDigest, type DigestInput } from "./digest";

const base: DigestInput = {
  revenue: 10000,
  prevRevenue: 8000,
  labor: 4000,
  grossProfit: 6000,
  margin: 60,
  outstanding: 3000,
  overdueAmount: 1200,
  overdueCount: 2,
  jobCount: 12,
  topCustomer: { name: "Acme", total: 4200 },
  goalPct: 83,
};

function keys(input: DigestInput) {
  return buildDigest(input).map((l) => l.key);
}

describe("buildDigest", () => {
  it("reports rising revenue with the rounded delta", () => {
    const line = buildDigest(base).find((l) => l.key.startsWith("revenue"))!;
    expect(line.key).toBe("revenueUp");
    expect(line.tone).toBe("good");
    expect(line.values.deltaPct).toBe(25); // (10000-8000)/8000
  });

  it("flags falling revenue as bad with a positive magnitude", () => {
    const line = buildDigest({ ...base, revenue: 6000, prevRevenue: 8000 }).find((l) =>
      l.key.startsWith("revenue")
    )!;
    expect(line.key).toBe("revenueDown");
    expect(line.tone).toBe("bad");
    expect(line.values.deltaPct).toBe(25);
  });

  it("uses revenueOnly when there's no prior window", () => {
    expect(keys({ ...base, prevRevenue: 0 })).toContain("revenueOnly");
  });

  it("marks a loss and overdue receivables as bad", () => {
    const lines = buildDigest({ ...base, grossProfit: -500, revenue: 3000 });
    expect(lines.find((l) => l.key === "profitNegative")?.tone).toBe("bad");
    expect(lines.find((l) => l.key === "owedWithOverdue")?.tone).toBe("bad");
  });

  it("uses owedClean when nothing is overdue, and omits receivables at zero", () => {
    expect(keys({ ...base, overdueAmount: 0 })).toContain("owedClean");
    expect(keys({ ...base, outstanding: 0, overdueAmount: 0 })).not.toContain("owedClean");
  });

  it("celebrates hitting the goal", () => {
    expect(buildDigest({ ...base, goalPct: 120 }).find((l) => l.key === "goalHit")?.tone).toBe(
      "good"
    );
    expect(keys({ ...base, goalPct: null })).not.toContain("goalProgress");
  });

  it("omits profit and jobs lines when there's no activity", () => {
    const k = keys({ ...base, revenue: 0, prevRevenue: 0, jobCount: 0, topCustomer: null });
    expect(k).not.toContain("profitPositive");
    expect(k).not.toContain("jobs");
    expect(k).not.toContain("topCustomer");
  });
});
