import { describe, expect, it } from "vitest";

import { buildInvoiceCsv, type CsvInvoice } from "./invoiceCsv";

const base: CsvInvoice = {
  number: 1,
  status: "SENT",
  customerName: "Acme Co",
  customerAddress: "123 Main St",
  issueDate: new Date("2026-01-15T00:00:00Z"),
  dueDate: new Date("2026-02-15T00:00:00Z"),
  paidAt: null,
  taxRate: 8.25,
  lineItems: [
    { quantity: 2, unitPrice: 100 },
    { quantity: 1, unitPrice: 50 },
  ],
};

function rows(csv: string): string[] {
  // Strip the BOM, split on CRLF, drop the trailing empty line.
  return csv.replace(/^﻿/, "").split("\r\n").filter(Boolean);
}

describe("buildInvoiceCsv", () => {
  it("emits a header row plus one row per invoice", () => {
    const out = rows(buildInvoiceCsv([base]));
    expect(out).toHaveLength(2);
    expect(out[0]).toContain("Invoice Number");
    expect(out[0]).toContain("Total");
  });

  it("computes subtotal, tax and total from line items", () => {
    // subtotal = 2*100 + 1*50 = 250; tax = 250 * 8.25% = 20.63; total = 270.63
    const out = rows(buildInvoiceCsv([base]))[1];
    expect(out).toContain('"250.00"');
    expect(out).toContain('"20.63"');
    expect(out).toContain('"270.63"');
  });

  it("formats the invoice number with the INV- prefix", () => {
    const out = rows(buildInvoiceCsv([base]))[1];
    expect(out).toContain('"INV-0001"');
  });

  it("escapes quotes and commas in customer fields", () => {
    const tricky = {
      ...base,
      customerName: 'Bob "The Builder", Inc.',
    };
    const out = rows(buildInvoiceCsv([tricky]))[1];
    // Embedded quotes are doubled; the comma stays inside the quoted cell.
    expect(out).toContain('"Bob ""The Builder"", Inc."');
  });

  it("leaves the paid date blank when unpaid", () => {
    const out = rows(buildInvoiceCsv([base]))[1];
    // Issue + due are set, paid is empty ("").
    expect(out).toContain('"2026-01-15"');
    expect(out).toContain('"2026-02-15"');
    expect(out).toContain(',""');
  });

  it("starts with a UTF-8 BOM so Excel reads accents", () => {
    expect(buildInvoiceCsv([base]).charCodeAt(0)).toBe(0xfeff);
  });

  it("emits only the header for an empty list", () => {
    expect(rows(buildInvoiceCsv([]))).toHaveLength(1);
  });
});
