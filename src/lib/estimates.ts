import type { EstimateStatus } from "@prisma/client";

export const ESTIMATE_STATUSES: EstimateStatus[] = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "DECLINED",
];

// "EST-0001" — same scheme as invoices, different prefix.
export function formatEstimateNumber(n: number): string {
  return `EST-${String(n).padStart(4, "0")}`;
}

// An estimate is expired when it isn't accepted/declined and its expiry
// date has passed. Totals reuse computeTotals from lib/invoices.
export function isEstimateExpired(
  status: EstimateStatus,
  expiryDate: Date | null,
  now: Date = new Date()
): boolean {
  if (status === "ACCEPTED" || status === "DECLINED" || !expiryDate) return false;
  return expiryDate.getTime() < now.getTime();
}
