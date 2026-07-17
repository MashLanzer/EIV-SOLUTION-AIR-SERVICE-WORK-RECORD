import { NextResponse } from "next/server";

import { getCurrencySymbol } from "@/lib/currency";
import { getFinancials, normalizeFinancialPeriod } from "@/lib/financials";
import { formatInvoiceNumber } from "@/lib/invoices";
import { requireOrgId } from "@/lib/orgScope";
import { requireFeature } from "@/lib/features";
import { requirePermission } from "@/lib/authz";

export const runtime = "nodejs";

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}
const isoDay = (d: Date | null): string => (d ? d.toISOString().slice(0, 10) : "");

const AGING_LABEL: Record<string, string> = {
  current: "Current",
  d1_30: "1-30 days",
  d31_60: "31-60 days",
  d61plus: "60+ days",
};

// A financial summary CSV for the selected period: the P&L figures, the A/R
// aging buckets, the open invoices, and the top customers — the same numbers
// the dashboard shows, in one spreadsheet-friendly file.
export async function GET(request: Request) {
  const session = await requirePermission("financials.view");
  const organizationId = requireOrgId(session);
  await requireFeature(organizationId, "invoicing");

  const period = normalizeFinancialPeriod(new URL(request.url).searchParams.get("period"));
  const [fin, currency] = await Promise.all([
    getFinancials(organizationId, period),
    getCurrencySymbol(organizationId),
  ]);

  const lines: string[] = [];
  const row = (a: string | number, b: string | number = "", c: string | number = "") =>
    lines.push([csvCell(a), csvCell(b), csvCell(c)].join(","));

  row("Financial summary", period);
  row("Range", isoDay(fin.start), isoDay(fin.end));
  row("Currency", currency);
  row("");
  row("Metric", "Amount");
  row("Revenue (paid)", fin.revenue.toFixed(2));
  row("Labor cost", fin.labor.toFixed(2));
  row("Gross profit", fin.grossProfit.toFixed(2));
  row("Margin %", fin.margin.toFixed(1));
  row("Tax collected", fin.tax.toFixed(2));
  row("Outstanding (A/R)", fin.outstanding.toFixed(2));
  row("");

  row("Accounts receivable aging", "Invoices", "Total");
  for (const b of fin.aging) {
    row(AGING_LABEL[b.key] ?? b.key, b.count, b.total.toFixed(2));
  }
  row("");

  row("Open invoices", "Customer", "Due / Days overdue / Total");
  for (const b of fin.aging) {
    for (const inv of b.invoices) {
      lines.push(
        [
          csvCell(formatInvoiceNumber(inv.number)),
          csvCell(inv.customerName),
          csvCell(isoDay(inv.dueDate)),
          csvCell(inv.daysOverdue),
          csvCell(inv.total.toFixed(2)),
        ].join(",")
      );
    }
  }
  row("");

  row("Top customers (paid this period)", "Revenue");
  for (const c of fin.topCustomers) {
    row(c.name, c.total.toFixed(2));
  }

  const csv = "﻿" + lines.join("\r\n") + "\r\n";
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financials-${period}-${today}.csv"`,
    },
  });
}
