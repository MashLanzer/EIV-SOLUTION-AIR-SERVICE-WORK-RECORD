import { describe, expect, it } from "vitest";

import {
  computeTotals,
  formatInvoiceNumber,
  isOverdue,
  roundMoney,
} from "@/lib/invoices";

describe("formatInvoiceNumber", () => {
  it("zero-pads to four digits and grows past that", () => {
    expect(formatInvoiceNumber(1)).toBe("INV-0001");
    expect(formatInvoiceNumber(42)).toBe("INV-0042");
    expect(formatInvoiceNumber(12345)).toBe("INV-12345");
  });
});

describe("roundMoney", () => {
  it("avoids binary-float drift", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(2.104)).toBe(2.1);
  });
});

describe("computeTotals", () => {
  it("sums line items and applies the tax rate", () => {
    const totals = computeTotals(
      [
        { quantity: 2, unitPrice: 10 },
        { quantity: 1, unitPrice: 5.5 },
      ],
      8.25
    );
    expect(totals.subtotal).toBe(25.5);
    expect(totals.tax).toBe(2.1); // 25.5 * 0.0825 = 2.10375 -> 2.10
    expect(totals.total).toBe(27.6);
  });

  it("treats a missing/negative tax rate as zero", () => {
    expect(computeTotals([{ quantity: 1, unitPrice: 100 }], null).tax).toBe(0);
    expect(computeTotals([{ quantity: 1, unitPrice: 100 }], -5).tax).toBe(0);
  });

  it("is all zero for no line items", () => {
    expect(computeTotals([], 10)).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });

  it("ignores non-numeric fields defensively", () => {
    const totals = computeTotals(
      [{ quantity: Number("abc"), unitPrice: 10 }],
      0
    );
    expect(totals.subtotal).toBe(0);
  });
});

describe("isOverdue", () => {
  const now = new Date("2026-07-14T00:00:00.000Z");
  const past = new Date("2026-07-01T00:00:00.000Z");
  const future = new Date("2026-08-01T00:00:00.000Z");

  it("is overdue when sent/draft and past the due date", () => {
    expect(isOverdue("SENT", past, now)).toBe(true);
    expect(isOverdue("DRAFT", past, now)).toBe(true);
  });

  it("is never overdue once paid or void", () => {
    expect(isOverdue("PAID", past, now)).toBe(false);
    expect(isOverdue("VOID", past, now)).toBe(false);
  });

  it("is not overdue without a due date or before it", () => {
    expect(isOverdue("SENT", null, now)).toBe(false);
    expect(isOverdue("SENT", future, now)).toBe(false);
  });
});
