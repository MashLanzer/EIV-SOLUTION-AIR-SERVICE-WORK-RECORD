import type { InvoiceStatus } from "@prisma/client";

// The lifecycle order used for status chips and validation.
export const INVOICE_STATUSES: InvoiceStatus[] = ["DRAFT", "SENT", "PAID", "VOID"];

// "INV-0001" - zero-padded to at least 4 digits, growing past that as needed.
export function formatInvoiceNumber(n: number): string {
  return `INV-${String(n).padStart(4, "0")}`;
}

// Round to cents, avoiding binary-float drift (e.g. 0.1 + 0.2).
export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface LineItemInput {
  quantity: number;
  unitPrice: number;
}

export interface InvoiceTotals {
  subtotal: number;
  tax: number;
  total: number;
}

// Subtotal = sum(quantity * unitPrice); tax = subtotal * rate%; total = both.
// A null/negative rate is treated as 0 so a missing tax setting never breaks
// the maths. Everything is rounded to cents.
export function computeTotals(
  items: LineItemInput[],
  taxRatePercent: number | null | undefined
): InvoiceTotals {
  const subtotal = roundMoney(
    items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0)
  );
  const rate = Math.max(0, Number(taxRatePercent) || 0);
  const tax = roundMoney(subtotal * (rate / 100));
  const total = roundMoney(subtotal + tax);
  return { subtotal, tax, total };
}

// An invoice is overdue when it isn't paid/void and its due date has passed.
export function isOverdue(
  status: InvoiceStatus,
  dueDate: Date | null,
  now: Date = new Date()
): boolean {
  if (status === "PAID" || status === "VOID" || !dueDate) return false;
  return dueDate.getTime() < now.getTime();
}
