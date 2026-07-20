// Collections: turning unpaid (SENT) invoices into an actionable, prioritised
// worklist. Pure + framework-free so the bucketing is unit-testable and shared
// by the page and any roll-up.

const DAY_MS = 24 * 60 * 60 * 1000;
// A not-yet-overdue invoice enters the worklist this many days before its due
// date, so the office can chase proactively instead of only after it's late.
export const DUE_SOON_DAYS = 7;

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// Whole days a due date is past. Positive = overdue, 0 = due today, negative =
// still upcoming. Null due date = 0 (can't be overdue without one).
export function daysOverdue(dueDate: Date | null, now: Date = new Date()): number {
  if (!dueDate) return 0;
  return Math.floor((startOfUtcDay(now) - startOfUtcDay(dueDate)) / DAY_MS);
}

// Most-urgent first. `due_soon` is upcoming-but-close; anything further out
// than DUE_SOON_DAYS isn't collectible yet and returns null (excluded).
export type CollectionBucketKey = "d61plus" | "d31_60" | "d1_30" | "due_soon";

export const COLLECTION_BUCKETS: CollectionBucketKey[] = [
  "d61plus",
  "d31_60",
  "d1_30",
  "due_soon",
];

export function collectionBucket(days: number): CollectionBucketKey | null {
  if (days > 60) return "d61plus";
  if (days > 30) return "d31_60";
  if (days >= 1) return "d1_30";
  if (days >= -DUE_SOON_DAYS) return "due_soon";
  return null;
}

// True once an invoice is at or past due (days >= 1). due_soon is not overdue.
export function isBucketOverdue(key: CollectionBucketKey): boolean {
  return key !== "due_soon";
}
