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
  // The immediately-preceding equal-length window, for the vs-previous compare.
  const monthsBack = period === "quarter" ? 3 : period === "year" ? 12 : 1;
  const prevStart = utcMonthStart(start.getUTCFullYear(), start.getUTCMonth() - monthsBack);
  const prevEnd = start;
  const paidSince = [start, trendStart, prevStart].reduce((a, b) => (a < b ? a : b));

  const [paidInvoices, sentInvoices, records, prevRecords, periodEstimates, org] =
    await Promise.all([
      prisma.invoice.findMany({
        where: { organizationId, status: "PAID", paidAt: { gte: paidSince } },
        select: {
          paidAt: true,
          issueDate: true,
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
        select: { leadInstallerPay: true, helperPay: true, typeOfWork: true },
      }),
      prisma.workRecord.findMany({
        where: { organizationId, status: "APPROVED", date: { gte: prevStart, lt: prevEnd } },
        select: { leadInstallerPay: true, helperPay: true },
      }),
      // Estimates raised in the period, for the win-rate / conversion figures.
      prisma.estimate.findMany({
        where: { organizationId, createdAt: { gte: start, lt: end } },
        select: {
          status: true,
          convertedInvoiceId: true,
          taxRate: true,
          lineItems: { select: { quantity: true, unitPrice: true } },
        },
      }),
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { monthlyRevenueGoal: true },
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
  // The same figures for the immediately-preceding window, for the compare.
  let prevRevenue = 0;
  const customerRevenue = new Map<string, number>();
  // 6-month trend buckets keyed by "YYYY-M".
  const trend = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = utcMonthStart(now.getUTCFullYear(), now.getUTCMonth() - 5 + i);
    trend.set(`${d.getUTCFullYear()}-${d.getUTCMonth()}`, 0);
  }

  // Days-to-pay (DSO): average gap between issuing and getting paid, over the
  // invoices whose payment landed in the period.
  let daysToPaySum = 0;
  let daysToPayCount = 0;
  for (const inv of paidInvoices) {
    const totals = invTotal(inv.lineItems, inv.taxRate);
    if (inRange(inv.paidAt, start, end)) {
      revenue += totals.total;
      tax += totals.tax;
      customerRevenue.set(
        inv.customerName,
        (customerRevenue.get(inv.customerName) ?? 0) + totals.total
      );
      if (inv.paidAt && inv.issueDate) {
        const days = Math.round((inv.paidAt.getTime() - inv.issueDate.getTime()) / 86_400_000);
        if (days >= 0) {
          daysToPaySum += days;
          daysToPayCount += 1;
        }
      }
    }
    if (inRange(inv.paidAt, prevStart, prevEnd)) prevRevenue += totals.total;
    if (inv.paidAt) {
      const key = `${inv.paidAt.getUTCFullYear()}-${inv.paidAt.getUTCMonth()}`;
      if (trend.has(key)) trend.set(key, (trend.get(key) ?? 0) + totals.total);
    }
  }

  // Expense breakdown. The only tracked cost is crew labor, itemised into the
  // lead installer's pay and the helpers' pay so the owner sees where it goes.
  let leadPay = 0;
  let helperPay = 0;
  // Labor cost split by the kind of work, so the owner sees which services
  // consume the crew's paid hours.
  const laborByTypeMap = new Map<string, { amount: number; count: number }>();
  for (const r of records) {
    const pay = Number(r.leadInstallerPay) + Number(r.helperPay ?? 0);
    leadPay += Number(r.leadInstallerPay);
    helperPay += Number(r.helperPay ?? 0);
    const type = r.typeOfWork?.trim() || "—";
    const bucket = laborByTypeMap.get(type) ?? { amount: 0, count: 0 };
    bucket.amount += pay;
    bucket.count += 1;
    laborByTypeMap.set(type, bucket);
  }
  const labor = leadPay + helperPay;
  const laborByType = [...laborByTypeMap.entries()]
    .map(([type, v]) => ({ type, amount: round(v.amount), count: v.count }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  let prevLabor = 0;
  for (const r of prevRecords) prevLabor += Number(r.leadInstallerPay) + Number(r.helperPay ?? 0);

  const grossProfit = revenue - labor;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const prevGrossProfit = prevRevenue - prevLabor;

  // Accounts-receivable aging: bucket each unpaid (SENT) invoice by how far
  // past its due date it is (null due date counts as current).
  const buckets: Record<AgingBucket["key"], AgingBucket> = {
    current: { key: "current", total: 0, count: 0, invoices: [] },
    d1_30: { key: "d1_30", total: 0, count: 0, invoices: [] },
    d31_60: { key: "d31_60", total: 0, count: 0, invoices: [] },
    d61plus: { key: "d61plus", total: 0, count: 0, invoices: [] },
  };
  // Collections forecast: the same unpaid invoices bucketed by when they're
  // due, so the owner can see expected cash in the coming weeks.
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day7 = new Date(todayStart.getTime() + 7 * 86_400_000);
  const day30 = new Date(todayStart.getTime() + 30 * 86_400_000);
  const collections = {
    overdue: { count: 0, amount: 0 } as PipelineCell,
    next7: { count: 0, amount: 0 } as PipelineCell,
    next30: { count: 0, amount: 0 } as PipelineCell,
    later: { count: 0, amount: 0 } as PipelineCell,
  };
  const debtorTotals = new Map<string, number>();
  let outstanding = 0;
  for (const inv of sentInvoices) {
    const total = invTotal(inv.lineItems, inv.taxRate).total;
    outstanding += total;
    debtorTotals.set(inv.customerName, (debtorTotals.get(inv.customerName) ?? 0) + total);
    const bucket =
      inv.dueDate == null
        ? collections.later
        : inv.dueDate < todayStart
          ? collections.overdue
          : inv.dueDate < day7
            ? collections.next7
            : inv.dueDate < day30
              ? collections.next30
              : collections.later;
    bucket.count += 1;
    bucket.amount += total;
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

  // Who owes the most right now (from the open/sent invoices).
  const topDebtors = [...debtorTotals.entries()]
    .map(([name, total]) => ({ name, total: round(total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  for (const c of Object.values(collections)) c.amount = round(c.amount);

  // Estimate conversion for the period: how quotes raised are landing, and the
  // won/lost money behind them. Win-rate is measured among decided quotes.
  const estimateStats = {
    total: periodEstimates.length,
    draft: 0,
    pending: 0,
    accepted: 0,
    declined: 0,
    wonAmount: 0,
    lostAmount: 0,
    winRate: 0,
  };
  for (const e of periodEstimates) {
    const total = invTotal(e.lineItems, e.taxRate).total;
    const won = e.status === "ACCEPTED" || e.convertedInvoiceId != null;
    if (won) {
      estimateStats.accepted += 1;
      estimateStats.wonAmount += total;
    } else if (e.status === "DECLINED") {
      estimateStats.declined += 1;
      estimateStats.lostAmount += total;
    } else if (e.status === "DRAFT") {
      estimateStats.draft += 1;
    } else {
      estimateStats.pending += 1;
    }
  }
  const decided = estimateStats.accepted + estimateStats.declined;
  estimateStats.winRate = decided > 0 ? round((estimateStats.accepted / decided) * 100) : 0;
  estimateStats.wonAmount = round(estimateStats.wonAmount);
  estimateStats.lostAmount = round(estimateStats.lostAmount);

  // Revenue goal for the window. The stored figure is monthly; scale it to the
  // period so quarter/year compare like-for-like.
  const rawGoal = org?.monthlyRevenueGoal != null ? Number(org.monthlyRevenueGoal) : null;
  const goalTarget = rawGoal != null && rawGoal > 0 ? round(rawGoal * monthsBack) : null;
  const goal = {
    target: goalTarget,
    pct: goalTarget != null ? round((revenue / goalTarget) * 100) : null,
  };

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
    previous: {
      revenue: round(prevRevenue),
      labor: round(prevLabor),
      grossProfit: round(prevGrossProfit),
    },
    expenses: {
      leadPay: round(leadPay),
      helperPay: round(helperPay),
      total: round(labor),
    },
    avgDaysToPay: daysToPayCount > 0 ? Math.round(daysToPaySum / daysToPayCount) : null,
    collections,
    estimateStats,
    laborByType,
    goal,
    trend: trendSeries,
    aging,
    topCustomers,
    topDebtors,
  };
}
