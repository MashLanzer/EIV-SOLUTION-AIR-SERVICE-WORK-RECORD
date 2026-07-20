// Money-flow model for the financials Sankey: revenue fans out into its cost
// buckets and the leftover profit. Pure + framework-free (the component draws
// the ribbons from these shares).

export type FlowKey = "labor" | "materials" | "expenses" | "profit";

export interface MoneyFlow {
  key: FlowKey;
  value: number;
  // Fraction of revenue (0-1), for sizing the ribbon.
  share: number;
}

export interface MoneyFlowModel {
  revenue: number;
  flows: MoneyFlow[];
  // True when costs exceeded revenue (profit floored to 0, so shares still fit).
  loss: boolean;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function buildMoneyFlow(input: {
  revenue: number;
  labor: number;
  materials: number;
  expenses: number;
}): MoneyFlowModel {
  const revenue = Math.max(0, round2(input.revenue));
  const labor = Math.max(0, round2(input.labor));
  const materials = Math.max(0, round2(input.materials));
  const expenses = Math.max(0, round2(input.expenses));
  const costs = round2(labor + materials + expenses);
  const profit = round2(Math.max(0, revenue - costs));
  const loss = costs > revenue;

  if (revenue <= 0) return { revenue: 0, flows: [], loss: false };

  const raw: { key: FlowKey; value: number }[] = [
    { key: "labor", value: labor },
    { key: "materials", value: materials },
    { key: "expenses", value: expenses },
    { key: "profit", value: profit },
  ];

  // When it's a loss, size ribbons against total costs so they still fill the
  // bar; otherwise against revenue (profit takes up the slack).
  const denom = loss ? costs : revenue;
  const flows = raw
    .filter((f) => f.value > 0)
    .map((f) => ({ key: f.key, value: f.value, share: denom > 0 ? f.value / denom : 0 }));

  return { revenue, flows, loss };
}
