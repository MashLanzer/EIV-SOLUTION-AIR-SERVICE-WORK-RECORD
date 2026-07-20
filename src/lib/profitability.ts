// Per-job profitability: revenue minus the three cost buckets (labor,
// materials, expenses). Pure + framework-free so it's unit-testable and can be
// reused by the record detail card and any future roll-up.

export interface ProfitabilityInput {
  // Billed/estimated revenue for the job (invoice subtotal, or a manual value).
  revenue: number;
  // Crew pay booked on the record (lead + helper).
  labor: number;
  // Sum of the record's material lines (quantity × unit cost).
  materials: number;
  // Sum of expenses linked to the record.
  expenses: number;
}

export interface Profitability extends ProfitabilityInput {
  // labor + materials + expenses
  cost: number;
  // revenue − cost
  margin: number;
  // margin as a percent of revenue; null when revenue is 0 (undefined ratio).
  marginPct: number | null;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeProfitability(input: ProfitabilityInput): Profitability {
  const revenue = round2(Math.max(0, input.revenue) || 0);
  const labor = round2(Math.max(0, input.labor) || 0);
  const materials = round2(Math.max(0, input.materials) || 0);
  const expenses = round2(Math.max(0, input.expenses) || 0);
  const cost = round2(labor + materials + expenses);
  const margin = round2(revenue - cost);
  const marginPct = revenue > 0 ? round2((margin / revenue) * 100) : null;
  return { revenue, labor, materials, expenses, cost, margin, marginPct };
}
