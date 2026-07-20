// Auto-categorization + anomaly detection for expenses. Pure + framework-free
// so both are unit-testable and shared by the server action and the page.

export interface RuleLike {
  keyword: string;
  categoryId: string;
}

// First rule whose keyword appears in the vendor (case-insensitive) wins.
// Returns the category id to file under, or null when nothing matches.
export function matchExpenseRule(vendor: string, rules: RuleLike[]): string | null {
  const v = vendor.trim().toLowerCase();
  if (!v) return null;
  for (const r of rules) {
    const k = r.keyword.trim().toLowerCase();
    if (k && v.includes(k)) return r.categoryId;
  }
  return null;
}

export type AnomalyReason = "duplicate" | "high";

export interface ExpenseLike {
  id: string;
  vendor: string;
  amount: number;
  date: string; // ISO
  categoryId: string | null;
}

// How many times the category's typical spend an expense must exceed to be
// "high", and how many samples a category needs before we trust that typical.
// The typical is the median (robust to the outlier itself skewing a mean).
const HIGH_FACTOR = 3;
const MIN_SAMPLE = 3;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

// Flag likely data-entry problems: exact duplicates (same vendor + amount +
// day) and outliers (an amount far above its category's average). Duplicate
// wins when both apply. Returns a map of expense id → reason.
export function detectExpenseAnomalies(expenses: ExpenseLike[]): Map<string, AnomalyReason> {
  const flags = new Map<string, AnomalyReason>();

  // Duplicates: group by vendor + amount + day; flag every member of a group
  // with more than one entry.
  const groups = new Map<string, string[]>();
  for (const e of expenses) {
    const key = `${e.vendor.trim().toLowerCase()}|${e.amount.toFixed(2)}|${dayKey(e.date)}`;
    const arr = groups.get(key);
    if (arr) arr.push(e.id);
    else groups.set(key, [e.id]);
  }
  for (const ids of groups.values()) {
    if (ids.length > 1) for (const id of ids) flags.set(id, "duplicate");
  }

  // Outliers: per category, compute the mean and flag amounts far above it,
  // but only once a category has enough history to have a stable average.
  const byCat = new Map<string, ExpenseLike[]>();
  for (const e of expenses) {
    if (!e.categoryId) continue;
    const arr = byCat.get(e.categoryId);
    if (arr) arr.push(e);
    else byCat.set(e.categoryId, [e]);
  }
  for (const list of byCat.values()) {
    if (list.length < MIN_SAMPLE) continue;
    const mid = median(list.map((e) => e.amount));
    if (mid <= 0) continue;
    for (const e of list) {
      if (flags.has(e.id)) continue; // duplicate already wins
      if (e.amount > HIGH_FACTOR * mid) flags.set(e.id, "high");
    }
  }

  return flags;
}
