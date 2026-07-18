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
  row("Avg. days to pay", fin.avgDaysToPay ?? "");
  row("Revenue goal (period)", fin.goal.target != null ? fin.goal.target.toFixed(2) : "");
  row("Goal reached %", fin.goal.pct != null ? fin.goal.pct.toFixed(1) : "");
  row("");

  row("Previous period", "Amount", "Change %");
  const pct = (cur: number, prev: number) =>
    prev !== 0 ? (((cur - prev) / Math.abs(prev)) * 100).toFixed(1) : "";
  row("Revenue (paid)", fin.previous.revenue.toFixed(2), pct(fin.revenue, fin.previous.revenue));
  row("Labor cost", fin.previous.labor.toFixed(2), pct(fin.labor, fin.previous.labor));
  row("Gross profit", fin.previous.grossProfit.toFixed(2), pct(fin.grossProfit, fin.previous.grossProfit));
  row("");

  row("Expense breakdown", "Amount");
  row("Lead installer pay", fin.expenses.leadPay.toFixed(2));
  row("Helper pay", fin.expenses.helperPay.toFixed(2));
  row("Total labor", fin.expenses.total.toFixed(2));
  row("");

  row("Labor by work type", "Jobs", "Amount");
  for (const l of fin.laborByType) {
    row(l.type, l.count, l.amount.toFixed(2));
  }
  row("");

  row("Collections forecast", "Invoices", "Total");
  row("Overdue", fin.collections.overdue.count, fin.collections.overdue.amount.toFixed(2));
  row("Next 7 days", fin.collections.next7.count, fin.collections.next7.amount.toFixed(2));
  row("Next 30 days", fin.collections.next30.count, fin.collections.next30.amount.toFixed(2));
  row("Later", fin.collections.later.count, fin.collections.later.amount.toFixed(2));
  row("");

  row("Estimate conversion", "Count", "Amount");
  row("Accepted / won", fin.estimateStats.accepted, fin.estimateStats.wonAmount.toFixed(2));
  row("Declined / lost", fin.estimateStats.declined, fin.estimateStats.lostAmount.toFixed(2));
  row("Pending", fin.estimateStats.pending);
  row("Draft", fin.estimateStats.draft);
  row("Win rate %", fin.estimateStats.winRate.toFixed(1));
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
  row("");

  row("Who owes you (open balance)", "Total");
  for (const c of fin.topDebtors) {
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
