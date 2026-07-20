import { describe, expect, it } from "vitest";

import { budgetStatus } from "./budgets";

describe("budgetStatus", () => {
  it("is ok well under budget", () => {
    const s = budgetStatus(300, 1000);
    expect(s.state).toBe("ok");
    expect(s.pct).toBe(30);
    expect(s.remaining).toBe(700);
  });

  it("flags near at 80% of budget", () => {
    expect(budgetStatus(800, 1000).state).toBe("near");
    expect(budgetStatus(799, 1000).state).toBe("ok");
  });

  it("flags over at/above budget and clamps the bar but not rawPct", () => {
    const s = budgetStatus(1500, 1000);
    expect(s.state).toBe("over");
    expect(s.pct).toBe(100);
    expect(s.rawPct).toBe(150);
    expect(s.remaining).toBe(-500);
  });

  it("treats a zero/absent budget as ok with no percentage", () => {
    const s = budgetStatus(500, 0);
    expect(s.state).toBe("ok");
    expect(s.rawPct).toBe(0);
  });
});
