import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/invoices";

const round = (n: number) => Math.round(n * 100) / 100;

// The reporting window driving every figure on the Financials dashboard.
export type FinancialPeriod = "month" | "last_month" | "quarter" | "year";
export const FINANCIAL_PERIODS: FinancialPeriod[] = ["month", "last_month", "quarter", "year"];

export function normalizeFinancialPeriod(value?: string | null): FinancialPeriod {
  return FINANCIAL_PERIODS.includes(value as FinancialPeriod)
    ? (value as FinancialPeriod)
    : "month";
}

function utcMonthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

// Resolve a period key into a concrete [start, end) UTC range.
export function financialRange(period: FinancialPeriod, now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  switch (period) {
    case "last_month":
      return { start: utcMonthStart(y, m - 1), end: utcMonthStart(y, m) };
    case "quarter": {
      const qStart = Math.floor(m / 3) * 3;
      return { start: utcMonthStart(y, qStart), end: utcMonthStart(y, qStart + 3) };
    }
    case "year":
      return { start: utcMonthStart(y, 0), end: utcMonthStart(y + 1, 0) };
    case "month":
    default:
      return { start: utcMonthStart(y, m), end: utcMonthStart(y, m + 1) };
  }
}

const inRange = (d: Date | null, start: Date, end: Date): boolean =>
  d != null && d >= start && d < end;

// A point-in-time view of open money: unpaid/undelivered documents grouped so
// the owner can act (send drafts, chase overdue, invoice accepted quotes).
export interface PipelineCell {
  count: number;
  amount: number;
}
export interface MoneyPipeline {
  invoicesDraft: PipelineCell;
  invoicesAwaiting: PipelineCell;
  invoicesOverdue: PipelineCell;
  estimatesDraft: PipelineCell;
  estimatesPending: PipelineCell;
  estimatesAccepted: PipelineCell;
  estimatesExpired: PipelineCell;
}

export async function getMoneyPipeline(
  organizationId: string,
  now: Date = new Date()
): Promise<MoneyPipeline> {
  const [openInvoices, openEstimates] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId, status: { in: ["DRAFT", "SENT"] } },
      select: {
        status: true,
        dueDate: true,
        taxRate: true,
        lineItems: { select: { quantity: true, unitPrice: true } },
      },
    }),
    prisma.estimate.findMany({
      where: { organizationId, status: { in: ["DRAFT", "SENT", "ACCEPTED"] } },
      select: {
        status: true,
        expiryDate: true,
        taxRate: true,
        lineItems: { select: { quantity: true, unitPrice: true } },
      },
    }),
  ]);

  const cell = (): PipelineCell => ({ count: 0, amount: 0 });
  const p: MoneyPipeline = {
    invoicesDraft: cell(),
    invoicesAwaiting: cell(),
    invoicesOverdue: cell(),
    estimatesDraft: cell(),
    estimatesPending: cell(),
    estimatesAccepted: cell(),
    estimatesExpired: cell(),
  };
  const amount = (li: { quantity: unknown; unitPrice: unknown }[], taxRate: unknown) =>
    computeTotals(
      li.map((l) => ({ quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
      Number(taxRate)
    ).total;
  const add = (c: PipelineCell, total: number) => {
    c.count += 1;
    c.amount += total;
  };

  for (const inv of openInvoices) {
    const total = amount(inv.lineItems, inv.taxRate);
    if (inv.status === "DRAFT") add(p.invoicesDraft, total);
    else if (inv.dueDate && inv.dueDate.getTime() < now.getTime()) add(p.invoicesOverdue, total);
    else add(p.invoicesAwaiting, total);
  }
  for (const est of openEstimates) {
    const total = amount(est.lineItems, est.taxRate);
    if (est.status === "DRAFT") add(p.estimatesDraft, total);
    else if (est.status === "ACCEPTED") add(p.estimatesAccepted, total);
    else if (est.expiryDate && est.expiryDate.getTime() < now.getTime()) add(p.estimatesExpired, total);
    else add(p.estimatesPending, total);
  }

  for (const k of Object.keys(p) as (keyof MoneyPipeline)[]) p[k].amount = round(p[k].amount);
  return p;
}

export interface AgingInvoice {
  id: string;
  number: number;
  customerName: string;
  total: number;
  dueDate: Date | null;
  daysOverdue: number;
}

export interface AgingBucket {
  key: "current" | "d1_30" | "d31_60" | "d61plus";
  total: number;
  count: number;
  invoices: AgingInvoice[];
}

// A period-aware financial snapshot: P&L for the window, a 6-month revenue
// trend, accounts-receivable aging (a point-in-time view of unpaid invoices),
// and the top customers by paid revenue. Org-scoped; call behind requireAdmin.
export async function getFinancials(
  organizationId: string,
  period: FinancialPeriod = "month",
  now: Date = new Date()
) {
  const { start, end } = financialRange(period, now);

  // The 6-month trend window (this month + the five before it).
  const trendStart = utcMonthStart(now.getUTCFullYear(), now.getUTCMonth() - 5);
  const paidSince = start < trendStart ? start : trendStart;

  const [paidInvoices, sentInvoices, records] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId, status: "PAID", paidAt: { gte: paidSince } },
      select: {
        paidAt: true,
        taxRate: true,
        customerName: true,
        lineItems: { select: { quantity: true, unitPrice: true } },
      },
    }),
    // Outstanding is a point-in-time snapshot, not bound to the period.
    prisma.invoice.findMany({
      where: { organizationId, status: "SENT" },
      select: {
        id: true,
        number: true,
        customerName: true,
        dueDate: true,
        taxRate: true,
        lineItems: { select: { quantity: true, unitPrice: true } },
      },
    }),
    prisma.workRecord.findMany({
      where: { organizationId, status: "APPROVED", date: { gte: start, lt: end } },
      select: { leadInstallerPay: true, helperPay: true },
    }),
  ]);

  const invTotal = (li: { quantity: unknown; unitPrice: unknown }[], taxRate: unknown) =>
    computeTotals(
      li.map((l) => ({ quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
      Number(taxRate)
    );

  // Period P&L (revenue + tax from paid invoices whose payment landed in range).
  let revenue = 0;
  let tax = 0;
  const customerRevenue = new Map<string, number>();
  // 6-month trend buckets keyed by "YYYY-M".
  const trend = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = utcMonthStart(now.getUTCFullYear(), now.getUTCMonth() - 5 + i);
    trend.set(`${d.getUTCFullYear()}-${d.getUTCMonth()}`, 0);
  }

  for (const inv of paidInvoices) {
    const totals = invTotal(inv.lineItems, inv.taxRate);
    if (inRange(inv.paidAt, start, end)) {
      revenue += totals.total;
      tax += totals.tax;
      customerRevenue.set(
        inv.customerName,
        (customerRevenue.get(inv.customerName) ?? 0) + totals.total
      );
    }
    if (inv.paidAt) {
      const key = `${inv.paidAt.getUTCFullYear()}-${inv.paidAt.getUTCMonth()}`;
      if (trend.has(key)) trend.set(key, (trend.get(key) ?? 0) + totals.total);
    }
  }

  let labor = 0;
  for (const r of records) labor += Number(r.leadInstallerPay) + Number(r.helperPay ?? 0);

  const grossProfit = revenue - labor;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  // Accounts-receivable aging: bucket each unpaid (SENT) invoice by how far
  // past its due date it is (null due date counts as current).
  const buckets: Record<AgingBucket["key"], AgingBucket> = {
    current: { key: "current", total: 0, count: 0, invoices: [] },
    d1_30: { key: "d1_30", total: 0, count: 0, invoices: [] },
    d31_60: { key: "d31_60", total: 0, count: 0, invoices: [] },
    d61plus: { key: "d61plus", total: 0, count: 0, invoices: [] },
  };
  let outstanding = 0;
  for (const inv of sentInvoices) {
    const total = invTotal(inv.lineItems, inv.taxRate).total;
    outstanding += total;
    const daysOverdue = inv.dueDate
      ? Math.floor((now.getTime() - inv.dueDate.getTime()) / 86_400_000)
      : 0;
    const key: AgingBucket["key"] =
      daysOverdue <= 0 ? "current" : daysOverdue <= 30 ? "d1_30" : daysOverdue <= 60 ? "d31_60" : "d61plus";
    const b = buckets[key];
    b.total += total;
    b.count += 1;
    if (b.invoices.length < 50) {
      b.invoices.push({
        id: inv.id,
        number: inv.number,
        customerName: inv.customerName,
        total: round(total),
        dueDate: inv.dueDate,
        daysOverdue: Math.max(0, daysOverdue),
      });
    }
  }
  const agingOrder: AgingBucket["key"][] = ["current", "d1_30", "d31_60", "d61plus"];
  const aging = agingOrder.map((k) => {
    const b = buckets[k];
    b.invoices.sort((a, z) => z.daysOverdue - a.daysOverdue);
    return { ...b, total: round(b.total) };
  });

  const topCustomers = [...customerRevenue.entries()]
    .map(([name, total]) => ({ name, total: round(total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const trendSeries = [...trend.entries()].map(([key, value]) => {
    const [yy, mm] = key.split("-").map(Number);
    return { year: yy, month: mm, value: round(value) };
  });

  return {
    period,
    start,
    end,
    revenue: round(revenue),
    labor: round(labor),
    grossProfit: round(grossProfit),
    margin: round(margin),
    tax: round(tax),
    outstanding: round(outstanding),
    trend: trendSeries,
    aging,
    topCustomers,
  };
}
