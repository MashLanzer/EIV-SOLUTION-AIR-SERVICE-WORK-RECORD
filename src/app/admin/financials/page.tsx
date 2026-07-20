import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  FileText,
  HandCoins,
  PiggyBank,
  Sheet,
  Target,
  Wallet,
} from "lucide-react";

import { BarList } from "@/components/charts/BarList";
import { MiniBarChart } from "@/components/super/MiniBarChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { FinancialsTabs } from "@/components/financials/FinancialsTabs";
import { FinancialsInsightsSheet } from "@/components/financials/FinancialsInsightsSheet";
import { FinancialDigest } from "@/components/financials/FinancialDigest";
import { ForecastChart } from "@/components/financials/ForecastChart";
import { ShareReportButton } from "@/components/financials/ShareReportButton";
import { SankeyChart, type SankeySegment } from "@/components/financials/SankeyChart";
import { FinancialsQuickActions } from "@/components/financials/FinancialsQuickActions";
import { MetricCard, Metric, MetricLink } from "@/components/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { formatInvoiceNumber } from "@/lib/invoices";
import { getCurrencySymbol } from "@/lib/currency";
import {
  FINANCIAL_PERIODS,
  getFinancials,
  getMoneyPipeline,
  normalizeFinancialPeriod,
  type FinancialPeriod,
  type PipelineCell,
} from "@/lib/financials";
import { buildDigest, DIGEST_MONEY_TOKENS, type DigestLine } from "@/lib/digest";
import { forecastRevenue } from "@/lib/forecast";
import { buildMoneyFlow, type FlowKey } from "@/lib/sankey";
import { requireFeature } from "@/lib/features";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getLocale, getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

// Fill a digest template: money tokens are formatted with the currency, the
// rest inserted as-is.
function resolveDigestLine(
  line: DigestLine,
  templates: Record<string, string>,
  money: (n: number) => string
): string {
  let s = templates[line.key] ?? "";
  for (const [k, v] of Object.entries(line.values)) {
    const val = DIGEST_MONEY_TOKENS.has(k) ? money(Number(v)) : String(v);
    s = s.replaceAll(`{${k}}`, val);
  }
  return s;
}

// A clickable pipeline cell: a label, its total amount and a doc count that
// deep-links to the matching filtered list. Muted when empty.
function PipelineTile({
  label,
  href,
  cell,
  money,
  countLabel,
  tone = "default",
}: {
  label: string;
  href: string;
  cell: PipelineCell;
  money: (n: number) => string;
  countLabel: (n: number) => string;
  tone?: "default" | "warning";
}) {
  const empty = cell.count === 0;
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col gap-0.5 p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
    >
      <span className="truncate text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      <span
        className={cn(
          "truncate text-lg font-semibold tabular-nums",
          empty
            ? "text-neutral-400 dark:text-neutral-600"
            : tone === "warning"
              ? "text-warning-text"
              : "text-neutral-900 dark:text-neutral-100"
        )}
      >
        {money(cell.amount)}
      </span>
      <span className="text-[11px] tabular-nums text-neutral-500 dark:text-neutral-400">
        {countLabel(cell.count)}
      </span>
    </Link>
  );
}

// One period-over-period figure: the current value, plus a delta pill comparing
// it to the previous equal-length window. `goodWhenUp` colours the delta green
// when the movement is desirable (revenue/profit up) vs amber when not (cost up).
function CompareCell({
  label,
  current,
  previous,
  money,
  goodWhenUp,
  vsLabel,
  noPrevLabel,
}: {
  label: string;
  current: number;
  previous: number;
  money: (n: number) => string;
  goodWhenUp: boolean;
  vsLabel: (prev: string) => string;
  noPrevLabel: string;
}) {
  const hasPrev = previous !== 0;
  const delta = current - previous;
  const pct = hasPrev ? (delta / Math.abs(previous)) * 100 : 0;
  const flat = Math.abs(pct) < 0.5;
  const up = delta > 0;
  // A rise is "good" for revenue/profit, "bad" for a cost line — and vice-versa.
  const good = flat ? null : up === goodWhenUp;
  return (
    <div className="flex min-w-0 flex-col gap-1 p-4">
      <span className="truncate text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="truncate text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {money(current)}
      </span>
      {hasPrev ? (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
            good == null
              ? "text-neutral-500 dark:text-neutral-400"
              : good
                ? "text-success-text"
                : "text-destructive-text"
          )}
        >
          <span aria-hidden="true">{flat ? "—" : up ? "▲" : "▼"}</span>
          {flat ? "0%" : `${up ? "+" : ""}${pct.toFixed(0)}%`}
          <span className="text-neutral-500 dark:text-neutral-400">{vsLabel(money(previous))}</span>
        </span>
      ) : (
        <span className="text-xs text-neutral-500 dark:text-neutral-400">{noPrevLabel}</span>
      )}
    </div>
  );
}

// A titled section wrapper, reused across the tab panels.
function Section({
  title,
  desc,
  action,
  children,
}: {
  title: string;
  desc?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {title}
          </h2>
          {desc && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export const dynamic = "force-dynamic";

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await requirePermission("financials.view");
  const organizationId = requireOrgId(session);
  await requireFeature(organizationId, "invoicing");

  const period = normalizeFinancialPeriod((await searchParams).period);
  const [fin, pipeline, currency, dict, locale, customerRows, orgDefaults] = await Promise.all([
    getFinancials(organizationId, period),
    getMoneyPipeline(organizationId),
    getCurrencySymbol(organizationId),
    getT(),
    getLocale(),
    // Seeds for the New invoice / New estimate sheets opened from Quick access.
    prisma.customer.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { defaultTaxRate: true, reportToken: true },
    }),
  ]);
  const quickCustomers = customerRows.map((c) => ({ id: c.id, name: c.name, address: c.address ?? "" }));
  const quickTaxRate = orgDefaults?.defaultTaxRate != null ? String(Number(orgDefaults.defaultTaxRate)) : "0";

  // Period material + expense cost, for the money-flow (Sankey). Materials come
  // from lines on approved records dated in the window; expenses from the
  // expense ledger dated in the window — matching how labor is scoped.
  const [periodExpenses, periodMaterials] = await Promise.all([
    prisma.expense.aggregate({
      where: { organizationId, date: { gte: fin.start, lt: fin.end } },
      _sum: { amount: true },
    }),
    prisma.recordMaterial.findMany({
      where: { record: { organizationId, status: "APPROVED", date: { gte: fin.start, lt: fin.end } } },
      select: { quantity: true, unitCost: true },
    }),
  ]);
  const expensesTotal = Number(periodExpenses._sum.amount ?? 0);
  const materialsTotal = periodMaterials.reduce(
    (s, m) => s + Number(m.quantity) * Number(m.unitCost),
    0
  );
  const t = dict.financials;
  const money = (n: number) => `${currency}${n.toFixed(2)}`;
  const docCount = (n: number) => (n === 1 ? t.countOne : t.countMany).replace("{n}", String(n));
  const vsPrev = (prev: string) => t.vsPrevious.replace("{value}", prev);
  const moneyShort = (n: number) => `${currency}${Math.round(n).toLocaleString(locale === "es" ? "es-ES" : "en-US")}`;

  const monthFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const dueFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  // Plain-language summary of the period, shown above the KPI tabs.
  const digestLines = buildDigest({
    revenue: fin.revenue,
    prevRevenue: fin.previous.revenue,
    labor: fin.labor,
    grossProfit: fin.grossProfit,
    margin: Math.round(fin.margin),
    outstanding: fin.outstanding,
    overdueAmount: fin.collections.overdue.amount,
    overdueCount: fin.collections.overdue.count,
    jobCount: fin.jobCount,
    topCustomer: fin.topCustomers[0] ?? null,
    goalPct: fin.goal.pct,
  }).map((line) => ({
    tone: line.tone,
    text: resolveDigestLine(line, dict.digest, moneyShort),
  }));

  // Revenue forecast from the 6-month trend, projecting the next 3 months.
  const tf = dict.forecast;
  const history = fin.trend.map((p) => p.value);
  const fc = forecastRevenue(history, 3);
  const showForecast = history.some((v) => v > 0);
  const lastTrend = fin.trend[fin.trend.length - 1];
  const forecastMonthLabels = [
    ...fin.trend.map((p) => monthFmt.format(new Date(Date.UTC(p.year, p.month, 1)))),
    ...fc.points.map((p) => monthFmt.format(new Date(Date.UTC(lastTrend.year, lastTrend.month + p.step, 1)))),
  ];
  const nextPoint = fc.points[0];

  // Money-flow (Sankey): revenue fanning out into labor, materials, expenses,
  // and the leftover profit.
  const tsk = dict.sankey;
  const flowLabel: Record<FlowKey, string> = {
    labor: tsk.labor,
    materials: tsk.materials,
    expenses: tsk.expenses,
    profit: tsk.profit,
  };
  const moneyFlow = buildMoneyFlow({
    revenue: fin.revenue,
    labor: fin.labor,
    materials: materialsTotal,
    expenses: expensesTotal,
  });
  const sankeySegments: SankeySegment[] = moneyFlow.flows.map((f) => ({
    key: f.key,
    label: flowLabel[f.key],
    amount: moneyShort(f.value),
    sharePct: Math.round(f.share * 100),
    share: f.share,
  }));

  const periodLabel: Record<FinancialPeriod, string> = {
    month: t.periodMonth,
    last_month: t.periodLastMonth,
    quarter: t.periodQuarter,
    year: t.periodYear,
  };
  const agingLabel: Record<string, string> = {
    current: t.agingCurrent,
    d1_30: t.aging1_30,
    d31_60: t.aging31_60,
    d61plus: t.aging61plus,
  };

  const trendBars = fin.trend.map((p) => ({
    label: monthFmt.format(new Date(Date.UTC(p.year, p.month, 1))),
    value: p.value,
    display: moneyShort(p.value),
  }));
  const hasTrend = fin.trend.some((p) => p.value > 0);
  const agingActive = fin.aging.filter((b) => b.count > 0);
  const daysLabel = (n: number) => (n === 1 ? t.daysValueOne : t.daysValue).replace("{n}", String(n));

  // Actionable alerts, built from figures already loaded.
  const severe = fin.aging.find((b) => b.key === "d61plus");
  const alerts: { key: string; text: string; href: string }[] = [];
  if (severe && severe.count > 0) {
    alerts.push({
      key: "overdue",
      text: (severe.count === 1 ? t.alertOverdue : t.alertOverdueMany).replace("{n}", String(severe.count)),
      href: "/admin/invoices?status=overdue",
    });
  }
  if (pipeline.invoicesDraft.count > 0) {
    alerts.push({
      key: "drafts",
      text: (pipeline.invoicesDraft.count === 1 ? t.alertDrafts : t.alertDraftsMany).replace(
        "{n}",
        String(pipeline.invoicesDraft.count)
      ),
      href: "/admin/invoices?status=DRAFT",
    });
  }
  if (pipeline.estimatesPending.count > 0) {
    alerts.push({
      key: "estimates",
      text: (pipeline.estimatesPending.count === 1 ? t.alertEstimates : t.alertEstimatesMany).replace(
        "{n}",
        String(pipeline.estimatesPending.count)
      ),
      href: "/admin/estimates?status=SENT",
    });
  }

  // Goal thermometer (period-scaled target).
  const goalPct = fin.goal.pct ?? 0;
  const goalClamped = Math.max(0, Math.min(100, goalPct));
  const goalRemaining = fin.goal.target != null ? Math.max(0, fin.goal.target - fin.revenue) : 0;

  // Collections health: how much of what's owed is already overdue, and how
  // much is due to land in the next 30 days.
  const overdueAmount = fin.collections.overdue.amount;
  const pctOverdue = fin.outstanding > 0 ? (overdueAmount / fin.outstanding) * 100 : 0;
  const expected30 = fin.collections.next7.amount + fin.collections.next30.amount;

  // Estimate funnel stages (created → sent → accepted → invoiced).
  const funnelSent = fin.estimateStats.total - fin.estimateStats.draft;

  // The heavier charts (trend, forecast, money-flow) live together in a sheet
  // so they don't sit on top of the KPIs and the tab nav. Built here, opened
  // from a single compact trigger below the digest.
  const hasAnalytics = hasTrend || showForecast || sankeySegments.length > 0;
  const analytics = (
    <>
      {hasTrend && <MiniBarChart title={t.revenueTrend} bars={trendBars} />}
      {showForecast && (
        <ForecastChart
          heading={tf.heading}
          history={history}
          points={fc.points}
          monthLabels={forecastMonthLabels}
          nextLabel={tf.nextMonth}
          nextValue={moneyShort(nextPoint.value)}
          rangeLabel={tf.range
            .replace("{low}", moneyShort(nextPoint.low))
            .replace("{high}", moneyShort(nextPoint.high))}
          confidenceLabel={tf.confidence.replace("{n}", String(fc.confidencePct))}
          slope={fc.slope}
        />
      )}
      {sankeySegments.length > 0 && (
        <SankeyChart
          heading={tsk.heading}
          revenueLabel={tsk.revenue}
          revenueAmount={moneyShort(moneyFlow.revenue)}
          segments={sankeySegments}
          loss={moneyFlow.loss}
          lossLabel={tsk.loss}
        />
      )}
    </>
  );

  // Action alerts (overdue / unsent drafts / pending estimates), shown right
  // under Quick actions so the nudges sit with the create shortcuts.
  const alertsBlock =
    alerts.length > 0 ? (
      <Card className="bg-warning-soft">
        <CardContent className="flex flex-col divide-y divide-warning-text/15 p-0">
          {alerts.map((a) => (
            <Link
              key={a.key}
              href={a.href}
              className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-warning-text/5"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning-text" />
              <span className="min-w-0 flex-1 font-medium text-warning-text">{a.text}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-warning-text/70" />
            </Link>
          ))}
        </CardContent>
      </Card>
    ) : (
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success-text" />
        {t.allClear}
      </div>
    );

  // ---- Tab panels ------------------------------------------------------

  const summaryPanel = (
    <>
      {/* Quick access — create (in a sheet) + jump to the doc lists. */}
      <Section title={t.quickActions}>
        <FinancialsQuickActions
          customers={quickCustomers}
          currency={currency}
          defaultTaxRate={quickTaxRate}
        />
      </Section>

      {/* Alerts sit directly under Quick actions. */}
      {alertsBlock}

      {/* Charts (trend, forecast, money-flow) — one tap, above the goal. */}
      {hasAnalytics && (
        <FinancialsInsightsSheet label={t.insights}>{analytics}</FinancialsInsightsSheet>
      )}

      {/* Revenue goal thermometer. */}
      {fin.goal.target != null ? (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {t.goalTitle}
              </span>
              <span className="ml-auto text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {money(fin.revenue)}{" "}
                <span className="font-normal text-neutral-500 dark:text-neutral-400">
                  {t.goalOf.replace("{value}", money(fin.goal.target))}
                </span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className={cn(
                  "bar-grow-in h-full rounded-full transition-all",
                  goalPct >= 100 ? "bg-success-text" : "bg-neutral-900 dark:bg-neutral-100"
                )}
                style={{ width: `${goalClamped}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
                {goalPct.toFixed(0)}%
              </span>
              <span className="text-neutral-500 dark:text-neutral-400">
                {goalPct >= 100 ? t.goalReached : t.goalRemaining.replace("{value}", money(goalRemaining))}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Link
          href="/admin/settings/company"
          className="flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-2.5 text-sm text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <Target className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{t.noGoal}</span>
          <span className="shrink-0 font-medium">{t.setGoal}</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      {/* Period P&L — grouped metric cards, matching the dashboard overview. */}
      <div className="flex flex-col gap-3">
        <MetricCard label={t.kpiResult} cols="grid-cols-3" clickable>
          <MetricLink value={moneyShort(fin.revenue)} label={t.revenue} href="/admin/invoices?status=PAID" />
          <MetricLink value={moneyShort(fin.labor)} label={t.labor} href="/admin/reports" />
          <MetricLink value={moneyShort(fin.grossProfit)} label={t.grossProfit} href="/admin/reports" />
        </MetricCard>
        <MetricCard label={t.kpiRatios} cols="grid-cols-2">
          <Metric value={`${fin.margin.toFixed(0)}%`} label={t.margin} />
          <Metric
            value={fin.avgDaysToPay != null ? daysLabel(fin.avgDaysToPay) : t.noDaysToPay}
            label={t.avgDaysToPay}
          />
        </MetricCard>
        <MetricCard label={t.kpiBalances} cols="grid-cols-2" clickable>
          <MetricLink value={moneyShort(fin.tax)} label={t.tax} href="/admin/invoices?status=PAID" />
          <MetricLink value={moneyShort(fin.outstanding)} label={t.outstanding} href="/admin/invoices?status=SENT" />
        </MetricCard>
      </div>

      {/* This period vs previous — is the business trending up or down? */}
      <Section title={t.comparison} desc={t.comparisonDesc}>
        <Card>
          <CardContent className="grid grid-cols-3 divide-x divide-neutral-100 p-0 dark:divide-neutral-800">
            <CompareCell
              label={t.revenue}
              current={fin.revenue}
              previous={fin.previous.revenue}
              money={money}
              goodWhenUp
              vsLabel={vsPrev}
              noPrevLabel={t.noPrevious}
            />
            <CompareCell
              label={t.labor}
              current={fin.labor}
              previous={fin.previous.labor}
              money={money}
              goodWhenUp={false}
              vsLabel={vsPrev}
              noPrevLabel={t.noPrevious}
            />
            <CompareCell
              label={t.grossProfit}
              current={fin.grossProfit}
              previous={fin.previous.grossProfit}
              money={money}
              goodWhenUp
              vsLabel={vsPrev}
              noPrevLabel={t.noPrevious}
            />
          </CardContent>
        </Card>
      </Section>
    </>
  );

  const collectionsPanel = (
    <>
      {/* Collections health — a snapshot of what's owed and how at-risk it is. */}
      {fin.outstanding > 0 && (
        <MetricCard label={t.collectionsHealthTitle} cols="grid-cols-3">
          <Metric value={moneyShort(fin.outstanding)} label={t.outstandingLabel} />
          <Metric value={`${pctOverdue.toFixed(0)}%`} label={t.pctOverdueLabel} />
          <Metric value={moneyShort(expected30)} label={t.expected30Label} />
        </MetricCard>
      )}

      {/* Collections forecast — expected cash from unpaid invoices by due date. */}
      <Section title={t.collectionsTitle} desc={t.collectionsDesc}>
        <Card>
          <CardContent className="grid grid-cols-2 divide-x divide-y divide-neutral-100 p-0 dark:divide-neutral-800 sm:grid-cols-4 sm:divide-y-0">
            <PipelineTile label={t.colOverdue} href="/admin/invoices?status=overdue" cell={fin.collections.overdue} money={money} countLabel={docCount} tone="warning" />
            <PipelineTile label={t.colNext7} href="/admin/invoices?status=SENT" cell={fin.collections.next7} money={money} countLabel={docCount} />
            <PipelineTile label={t.colNext30} href="/admin/invoices?status=SENT" cell={fin.collections.next30} money={money} countLabel={docCount} />
            <PipelineTile label={t.colLater} href="/admin/invoices?status=SENT" cell={fin.collections.later} money={money} countLabel={docCount} />
          </CardContent>
        </Card>
      </Section>

      {/* Invoices pipeline — open money grouped so it's actionable. */}
      <Section
        title={t.pipelineInvoices}
        action={
          <Link
            href="/admin/invoices"
            className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {t.viewInvoices}
          </Link>
        }
      >
        <Card>
          <CardContent className="grid grid-cols-3 divide-x divide-neutral-100 p-0 dark:divide-neutral-800">
            <PipelineTile label={dict.invoices.statusDraft} href="/admin/invoices?status=DRAFT" cell={pipeline.invoicesDraft} money={money} countLabel={docCount} />
            <PipelineTile label={t.awaiting} href="/admin/invoices?status=SENT" cell={pipeline.invoicesAwaiting} money={money} countLabel={docCount} />
            <PipelineTile label={dict.invoices.chipOverdue} href="/admin/invoices?status=overdue" cell={pipeline.invoicesOverdue} money={money} countLabel={docCount} tone="warning" />
          </CardContent>
        </Card>
      </Section>

      {/* Accounts receivable aging */}
      <Section title={t.receivables} desc={t.receivablesDesc}>
        {agingActive.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState icon={PiggyBank} title={t.noReceivables} description={t.noReceivablesDesc} />
            </CardContent>
          </Card>
        ) : (
          agingActive.map((bucket) => (
            <Card key={bucket.key}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {agingLabel[bucket.key]}
                    </span>
                    <Badge variant={bucket.key === "current" ? "secondary" : bucket.key === "d61plus" ? "destructive" : "warning"}>
                      {(bucket.count === 1 ? t.invoiceCountOne : t.invoiceCountMany).replace(
                        "{n}",
                        String(bucket.count)
                      )}
                    </Badge>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {money(bucket.total)}
                  </span>
                </div>
                <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                  {bucket.invoices.map((inv) => (
                    <li key={inv.id}>
                      <Link
                        href={`/admin/invoices/${inv.id}`}
                        className="flex items-center gap-3 py-2 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                              {formatInvoiceNumber(inv.number)}
                            </span>
                            {inv.daysOverdue > 0 && (
                              <span className="text-xs text-warning-text">
                                {(inv.daysOverdue === 1 ? t.overdueDaysOne : t.overdueDaysMany).replace(
                                  "{n}",
                                  String(inv.daysOverdue)
                                )}
                              </span>
                            )}
                          </div>
                          <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                            {inv.customerName}
                            {inv.dueDate ? ` · ${t.dueIn} ${dueFmt.format(inv.dueDate)}` : ""}
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                          {money(inv.total)}
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))
        )}
      </Section>

      {/* Who owes you — top debtors by open balance. */}
      <Section
        title={t.topDebtors}
        desc={t.topDebtorsDesc}
        action={<CalendarClock className="h-4 w-4 text-neutral-300 dark:text-neutral-600" />}
      >
        <Card>
          <CardContent className="p-4">
            {fin.topDebtors.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.noDebtors}</p>
            ) : (
              <BarList
                data={fin.topDebtors.map((c) => ({ label: c.name, value: c.total }))}
                formatValue={money}
                labelWidth="8rem"
              />
            )}
          </CardContent>
        </Card>
      </Section>
    </>
  );

  const salesPanel = (
    <>
      {/* Sales metrics — the shape of the deals won this period. */}
      {fin.estimateStats.total > 0 && (
        <MetricCard label={t.salesMetricsTitle} cols="grid-cols-3">
          <Metric value={moneyShort(fin.estimateStats.avgWonValue)} label={t.avgDeal} />
          <Metric
            value={
              fin.estimateStats.avgDaysToClose != null
                ? daysLabel(fin.estimateStats.avgDaysToClose)
                : t.noDaysToPay
            }
            label={t.daysToClose}
          />
          <Metric value={String(fin.estimateStats.converted)} label={t.invoicedShort} />
        </MetricCard>
      )}

      {/* Estimate conversion — how quotes raised this period are landing. */}
      <Section
        title={t.conversionTitle}
        desc={t.conversionDesc}
        action={
          <Link
            href="/admin/estimates"
            className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {dict.nav.estimates}
          </Link>
        }
      >
        {fin.estimateStats.total === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState icon={FileText} title={t.noEstimates} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-4 p-4">
              <div className="flex items-center gap-4">
                <div className="flex shrink-0 flex-col items-center">
                  <span className="text-3xl font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {fin.estimateStats.winRate.toFixed(0)}%
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{t.winRate}</span>
                </div>
                <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-neutral-500 dark:text-neutral-400">{t.wonLabel}</span>
                    <span className="font-semibold tabular-nums text-success-text">{money(fin.estimateStats.wonAmount)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-neutral-500 dark:text-neutral-400">{t.lostLabel}</span>
                    <span className="font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">{money(fin.estimateStats.lostAmount)}</span>
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">{t.estAccepted}: {fin.estimateStats.accepted}</Badge>
                <Badge variant="secondary">{t.estDeclined}: {fin.estimateStats.declined}</Badge>
                <Badge variant="secondary">{t.estPending}: {fin.estimateStats.pending}</Badge>
                <Badge variant="secondary">{t.estDraft}: {fin.estimateStats.draft}</Badge>
              </div>
              {fin.estimateStats.converted > 0 && (
                <p className="border-t border-neutral-100 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  {t.realizedRevenue.replace("{value}", money(fin.estimateStats.convertedAmount))}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </Section>

      {/* Estimate funnel — created → sent → accepted → invoiced (counts). */}
      {fin.estimateStats.total > 0 && (
        <Section title={t.funnelTitle} desc={t.funnelDesc}>
          <Card>
            <CardContent className="p-4">
              <BarList
                data={[
                  { label: t.funnelCreated, value: fin.estimateStats.total },
                  { label: t.funnelSent, value: funnelSent },
                  { label: t.funnelAccepted, value: fin.estimateStats.accepted },
                  { label: t.funnelInvoiced, value: fin.estimateStats.converted },
                ]}
                labelWidth="7rem"
              />
            </CardContent>
          </Card>
        </Section>
      )}

      {/* Estimates pipeline. */}
      <Section
        title={t.pipelineEstimates}
        action={
          <Link
            href="/admin/estimates"
            className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {dict.nav.estimates}
          </Link>
        }
      >
        <Card>
          <CardContent className="grid grid-cols-2 divide-x divide-y divide-neutral-100 p-0 dark:divide-neutral-800 sm:grid-cols-4 sm:divide-y-0">
            <PipelineTile label={dict.estimates.statusDraft} href="/admin/estimates?status=DRAFT" cell={pipeline.estimatesDraft} money={money} countLabel={docCount} />
            <PipelineTile label={dict.estimates.pending} href="/admin/estimates?status=SENT" cell={pipeline.estimatesPending} money={money} countLabel={docCount} />
            <PipelineTile label={dict.estimates.statusAccepted} href="/admin/estimates?status=ACCEPTED" cell={pipeline.estimatesAccepted} money={money} countLabel={docCount} />
            <PipelineTile label={dict.estimates.chipExpired} href="/admin/estimates?status=expired" cell={pipeline.estimatesExpired} money={money} countLabel={docCount} tone="warning" />
          </CardContent>
        </Card>
      </Section>

      {/* Top customers */}
      <Section
        title={t.topCustomers}
        desc={t.topCustomersDesc}
        action={
          fin.outstanding > 0 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/invoices?status=overdue">
                <AlertTriangle className="h-4 w-4" />
                {t.viewInvoices}
              </Link>
            </Button>
          ) : undefined
        }
      >
        <Card>
          <CardContent className="p-4">
            {fin.topCustomers.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.noCustomers}</p>
            ) : (
              <BarList
                data={fin.topCustomers.map((c) => ({ label: c.name, value: c.total }))}
                formatValue={money}
                labelWidth="8rem"
              />
            )}
          </CardContent>
        </Card>
      </Section>
    </>
  );

  const costsPanel = (
    <>
      {/* Cost efficiency — how hard the labor spend is working. */}
      {fin.jobCount > 0 && (
        <MetricCard label={t.costMetricsTitle} cols="grid-cols-2">
          <Metric value={`${fin.laborRatio.toFixed(0)}%`} label={t.laborRatio} />
          <Metric value={moneyShort(fin.avgCostPerJob)} label={t.costPerJob} />
        </MetricCard>
      )}

      {/* Expense breakdown — where the tracked labor cost goes. */}
      <Section title={t.expenseBreakdown} desc={t.expenseBreakdownDesc}>
        <Card>
          <CardContent className="p-4">
            {fin.expenses.total === 0 ? (
              <EmptyState icon={HandCoins} title={t.noExpenses} description={t.noExpensesDesc} />
            ) : (
              <div className="flex flex-col gap-3">
                <BarList
                  data={[
                    { label: t.leadPay, value: fin.expenses.leadPay },
                    { label: t.helperPay, value: fin.expenses.helperPay },
                  ]}
                  formatValue={money}
                  labelWidth="9rem"
                />
                <div className="flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    {t.totalExpenses}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {money(fin.expenses.total)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      {/* Cost by crew member — who the payroll goes to. */}
      {fin.costByWorker.length > 0 && (
        <Section
          title={t.costByWorkerTitle}
          desc={t.costByWorkerDesc}
          action={
            <Link
              href="/admin/reports"
              className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              {dict.nav.payReport}
            </Link>
          }
        >
          <Card>
            <CardContent className="p-4">
              <BarList
                data={fin.costByWorker.map((w) => ({ label: w.name, value: w.amount }))}
                formatValue={money}
                labelWidth="8rem"
              />
            </CardContent>
          </Card>
        </Section>
      )}

      {/* Labor cost by work type. */}
      {fin.laborByType.length > 0 && (
        <Section title={t.laborByTypeTitle} desc={t.laborByTypeDesc}>
          <Card>
            <CardContent className="p-4">
              <BarList
                data={fin.laborByType.map((l) => ({ label: l.type, value: l.amount }))}
                formatValue={money}
                labelWidth="9rem"
              />
            </CardContent>
          </Card>
        </Section>
      )}
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      <SectionTabs family="money" />
      <PageHeader
        title={t.title}
        action={
          <div className="flex items-center gap-2">
            <ShareReportButton initialToken={orgDefaults?.reportToken ?? null} />
            <Button asChild variant="outline" size="sm">
              <a href={`/admin/financials/export?period=${period}`}>
                <Sheet className="h-4 w-4" />
                <span className="hidden sm:inline">{t.exportCsv}</span>
              </a>
            </Button>
          </div>
        }
      />

      {/* Period selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FINANCIAL_PERIODS.map((p) => (
          <FilterChip key={p} href={`/admin/financials?period=${p}`} active={p === period}>
            {periodLabel[p]}
          </FilterChip>
        ))}
      </div>

      {/* Tabs (with Quick actions + KPIs) sit up top — the actionable stuff
          the office reaches for first, above the summary + charts + alerts. */}
      <FinancialsTabs
        ariaLabel={t.title}
        panels={[
          { key: "summary", label: t.tabSummary, icon: <Wallet className="h-4 w-4" />, content: summaryPanel },
          { key: "collections", label: t.tabCollections, icon: <PiggyBank className="h-4 w-4" />, content: collectionsPanel },
          { key: "sales", label: t.tabSales, icon: <FileText className="h-4 w-4" />, content: salesPanel },
          { key: "costs", label: t.tabCosts, icon: <HandCoins className="h-4 w-4" />, content: costsPanel },
        ]}
      />

      {/* Plain-language digest of the selected period. */}
      <FinancialDigest heading={dict.digest.heading} lines={digestLines} />
    </div>
  );
}
