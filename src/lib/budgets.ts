// Budget health for a category's month-to-date spend vs its monthly budget.
// Pure + framework-free so the thresholds are unit-testable and shared by the
// page and any alert roll-up.

export type BudgetState = "ok" | "near" | "over";

// Spend at or above this fraction of budget is "near"; at/above 1.0 is "over".
export const BUDGET_NEAR_THRESHOLD = 0.8;

export interface BudgetStatus {
  spent: number;
  budget: number;
  // Clamped 0-100 for the bar; use `rawPct` for the true (possibly >100) figure.
  pct: number;
  rawPct: number;
  remaining: number; // budget − spent (may be negative)
  state: BudgetState;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function budgetStatus(spent: number, budget: number): BudgetStatus {
  const s = Math.max(0, round2(spent));
  const b = Math.max(0, round2(budget));
  const rawPct = b > 0 ? Math.round((s / b) * 100) : 0;
  const ratio = b > 0 ? s / b : 0;
  const state: BudgetState = b <= 0 ? "ok" : ratio >= 1 ? "over" : ratio >= BUDGET_NEAR_THRESHOLD ? "near" : "ok";
  return {
    spent: s,
    budget: b,
    pct: Math.min(100, Math.max(0, rawPct)),
    rawPct,
    remaining: round2(b - s),
    state,
  };
}
