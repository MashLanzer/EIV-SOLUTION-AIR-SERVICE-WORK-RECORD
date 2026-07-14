import { computeTotals, formatInvoiceNumber } from "@/lib/invoices";
import type { InvoiceStatus } from "@prisma/client";

// A single invoice shaped for CSV export. Line items carry the raw numbers so
// we recompute subtotal/tax/total the same way the rest of the app does.
export type CsvInvoice = {
  number: number;
  status: InvoiceStatus;
  customerName: string;
  customerAddress: string | null;
  issueDate: Date;
  dueDate: Date | null;
  paidAt: Date | null;
  taxRate: number;
  lineItems: { quantity: number; unitPrice: number }[];
};

// Wrap a field for CSV: always quote, and double any embedded quotes so commas,
// quotes and newlines inside customer names/addresses can't break columns.
function csvCell(value: string | number): string {
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

const isoDay = (d: Date | null): string => (d ? d.toISOString().slice(0, 10) : "");

// Build a QuickBooks/Excel-friendly CSV of invoices. Columns are stable and
// self-describing so an accountant can import them without remapping. Money is
// plain numbers (no currency symbol) so spreadsheets treat them as numeric.
export function buildInvoiceCsv(invoices: CsvInvoice[]): string {
  const headers = [
    "Invoice Number",
    "Status",
    "Customer",
    "Address",
    "Issue Date",
    "Due Date",
    "Paid Date",
    "Tax Rate %",
    "Subtotal",
    "Tax",
    "Total",
  ];

  const lines = [headers.map(csvCell).join(",")];

  for (const inv of invoices) {
    const totals = computeTotals(inv.lineItems, inv.taxRate);
    lines.push(
      [
        csvCell(formatInvoiceNumber(inv.number)),
        csvCell(inv.status),
        csvCell(inv.customerName),
        csvCell(inv.customerAddress ?? ""),
        csvCell(isoDay(inv.issueDate)),
        csvCell(isoDay(inv.dueDate)),
        csvCell(isoDay(inv.paidAt)),
        csvCell(inv.taxRate.toFixed(2)),
        csvCell(totals.subtotal.toFixed(2)),
        csvCell(totals.tax.toFixed(2)),
        csvCell(totals.total.toFixed(2)),
      ].join(",")
    );
  }

  // Leading BOM so Excel opens UTF-8 accents (á, ñ) correctly; CRLF line ends
  // are what spreadsheet importers expect.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
