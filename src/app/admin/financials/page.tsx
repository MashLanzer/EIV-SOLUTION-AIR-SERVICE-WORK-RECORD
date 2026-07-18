import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock,
  Contact,
  CreditCard,
  FilePlus2,
  FileText,
  HandCoins,
  Landmark,
  Minus,
  Percent,
  PiggyBank,
  Receipt,
  ReceiptText,
  Sheet,
  Target,
  TrendingUp,
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
import { StatTile } from "@/components/ui/stat-tile";
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
import { requireFeature } from "@/lib/features";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getLocale, getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

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
      <span className="text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500">
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
  const Arrow = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
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
              ? "text-neutral-400 dark:text-neutral-500"
              : good
                ? "text-success-text"
                : "text-warning-text"
          )}
        >
          <Arrow className="h-3.5 w-3.5" />
          {flat ? "0%" : `${up ? "+" : ""}${pct.toFixed(0)}%`}
          <span className="text-neutral-400 dark:text-neutral-500">{vsLabel(money(previous))}</span>
        </span>
      ) : (
        <span className="text-xs text-neutral-400 dark:text-neutral-500">{noPrevLabel}</span>
      )}
    </div>
  );
}

// One tap-target in the quick-actions grid.
function ActionTile({ icon: Icon, label, href }: { icon: typeof Receipt; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-1 py-3 text-center text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
    >
      <Icon className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </Link>
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
  const [fin, pipeline, currency, dict, locale] = await Promise.all([
    getFinancials(organizationId, period),
    getMoneyPipeline(organizationId),
    getCurrencySymbol(organizationId),
    getT(),
    getLocale(),
  ]);
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

  return (
    <div className="flex flex-col gap-4">
      <SectionTabs family="money" />
      <PageHeader
        title={t.title}
        action={
          <Button asChild variant="outline" size="sm">
            <a href={`/admin/financials/export?period=${period}`}>
              <Sheet className="h-4 w-4" />
              <span className="hidden sm:inline">{t.exportCsv}</span>
            </a>
          </Button>
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

      {/* Action alerts — the few things worth doing something about. */}
      {alerts.length > 0 ? (
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
      )}

      {/* Revenue goal thermometer. */}
      {fin.goal.target != null ? (
        <Card>
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {t.goalTitle}
              </span>
              <span className="ml-auto text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                {money(fin.revenue)}{" "}
                <span className="font-normal text-neutral-400 dark:text-neutral-500">
                  {t.goalOf.replace("{value}", money(fin.goal.target))}
                </span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  goalPct >= 100 ? "bg-success-text" : "bg-neutral-900 dark:bg-neutral-100"
                )}
                style={{ width: `${goalClamped}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
                {goalPct.toFixed(0)}%
              </span>
              <span className="text-neutral-400 dark:text-neutral-500">
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

      {/* Period P&L — each figure drills into where the money lives. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon={Wallet} value={money(fin.revenue)} label={t.revenue} tone="success" href="/admin/invoices?status=PAID" />
        <StatTile icon={HandCoins} value={money(fin.labor)} label={t.labor} href="/admin/reports" />
        <StatTile
          icon={TrendingUp}
          value={money(fin.grossProfit)}
          label={t.grossProfit}
          tone={fin.grossProfit >= 0 ? "success" : "warning"}
          href="/admin/reports"
        />
        <StatTile
          icon={Percent}
          value={`${fin.margin.toFixed(0)}%`}
          label={t.margin}
          tone={fin.margin >= 0 ? "default" : "warning"}
        />
        <StatTile icon={Landmark} value={money(fin.tax)} label={t.tax} href="/admin/invoices?status=PAID" />
        <StatTile
          icon={PiggyBank}
          value={money(fin.outstanding)}
          label={t.outstanding}
          tone={fin.outstanding > 0 ? "warning" : "default"}
          href="/admin/invoices?status=SENT"
        />
        <StatTile
          icon={Clock}
          value={fin.avgDaysToPay != null ? daysLabel(fin.avgDaysToPay) : t.noDaysToPay}
          label={t.avgDaysToPay}
        />
      </div>

      {/* This period vs previous — is the business trending up or down? */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t.comparison}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{t.comparisonDesc}</p>
        </div>
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
      </section>

      {/* Expense breakdown — where the tracked labor cost goes. */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t.expenseBreakdown}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{t.expenseBreakdownDesc}</p>
        </div>
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
      </section>

      {/* Labor cost by work type. */}
      {fin.laborByType.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.laborByTypeTitle}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{t.laborByTypeDesc}</p>
          </div>
          <Card>
            <CardContent className="p-4">
              <BarList
                data={fin.laborByType.map((l) => ({ label: l.type, value: l.amount }))}
                formatValue={money}
                labelWidth="9rem"
              />
            </CardContent>
          </Card>
        </section>
      )}

      {/* Collections forecast — expected cash from unpaid invoices by due date. */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t.collectionsTitle}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{t.collectionsDesc}</p>
        </div>
        <Card>
          <CardContent className="grid grid-cols-2 divide-x divide-y divide-neutral-100 p-0 dark:divide-neutral-800 sm:grid-cols-4 sm:divide-y-0">
            <PipelineTile label={t.colOverdue} href="/admin/invoices?status=overdue" cell={fin.collections.overdue} money={money} countLabel={docCount} tone="warning" />
            <PipelineTile label={t.colNext7} href="/admin/invoices?status=SENT" cell={fin.collections.next7} money={money} countLabel={docCount} />
            <PipelineTile label={t.colNext30} href="/admin/invoices?status=SENT" cell={fin.collections.next30} money={money} countLabel={docCount} />
            <PipelineTile label={t.colLater} href="/admin/invoices?status=SENT" cell={fin.collections.later} money={money} countLabel={docCount} />
          </CardContent>
        </Card>
      </section>

      {/* Estimate conversion — how quotes raised this period are landing. */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.conversionTitle}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{t.conversionDesc}</p>
          </div>
          <Link
            href="/admin/estimates"
            className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {dict.nav.estimates}
          </Link>
        </div>
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
            </CardContent>
          </Card>
        )}
      </section>

      {/* Quick actions — create + jump to every money section. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {t.quickActions}
        </h2>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          <ActionTile icon={ReceiptText} label={dict.nav.newInvoice} href="/admin/invoices/new" />
          <ActionTile icon={FilePlus2} label={dict.nav.newEstimate} href="/admin/estimates/new" />
          <ActionTile icon={Receipt} label={dict.nav.invoices} href="/admin/invoices" />
          <ActionTile icon={FileText} label={dict.nav.estimates} href="/admin/estimates" />
          <ActionTile icon={Contact} label={dict.nav.customers} href="/admin/customers" />
          <ActionTile icon={BarChart3} label={dict.nav.payReport} href="/admin/reports" />
          <ActionTile icon={CreditCard} label={dict.settings.paymentsRow} href="/admin/payments" />
        </div>
      </section>

      {/* Invoices pipeline — open money grouped so it's actionable. */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t.pipelineInvoices}
          </h2>
          <Link
            href="/admin/invoices"
            className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {t.viewInvoices}
          </Link>
        </div>
        <Card>
          <CardContent className="grid grid-cols-3 divide-x divide-neutral-100 p-0 dark:divide-neutral-800">
            <PipelineTile label={dict.invoices.statusDraft} href="/admin/invoices?status=DRAFT" cell={pipeline.invoicesDraft} money={money} countLabel={docCount} />
            <PipelineTile label={t.awaiting} href="/admin/invoices?status=SENT" cell={pipeline.invoicesAwaiting} money={money} countLabel={docCount} />
            <PipelineTile label={dict.invoices.chipOverdue} href="/admin/invoices?status=overdue" cell={pipeline.invoicesOverdue} money={money} countLabel={docCount} tone="warning" />
          </CardContent>
        </Card>
      </section>

      {/* Estimates pipeline. */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t.pipelineEstimates}
          </h2>
          <Link
            href="/admin/estimates"
            className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {dict.nav.estimates}
          </Link>
        </div>
        <Card>
          <CardContent className="grid grid-cols-2 divide-x divide-y divide-neutral-100 p-0 dark:divide-neutral-800 sm:grid-cols-4 sm:divide-y-0">
            <PipelineTile label={dict.estimates.statusDraft} href="/admin/estimates?status=DRAFT" cell={pipeline.estimatesDraft} money={money} countLabel={docCount} />
            <PipelineTile label={dict.estimates.pending} href="/admin/estimates?status=SENT" cell={pipeline.estimatesPending} money={money} countLabel={docCount} />
            <PipelineTile label={dict.estimates.statusAccepted} href="/admin/estimates?status=ACCEPTED" cell={pipeline.estimatesAccepted} money={money} countLabel={docCount} />
            <PipelineTile label={dict.estimates.chipExpired} href="/admin/estimates?status=expired" cell={pipeline.estimatesExpired} money={money} countLabel={docCount} tone="warning" />
          </CardContent>
        </Card>
      </section>

      {/* Revenue trend */}
      {hasTrend ? (
        <MiniBarChart title={t.revenueTrend} bars={trendBars} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={TrendingUp} title={t.noRevenue} description={t.revenueTrendDesc} />
          </CardContent>
        </Card>
      )}

      {/* Accounts receivable aging */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {t.receivables}
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{t.receivablesDesc}</p>
        </div>
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
                        <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      {/* Top customers */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.topCustomers}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{t.topCustomersDesc}</p>
          </div>
          {fin.outstanding > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/invoices?status=overdue">
                <AlertTriangle className="h-4 w-4" />
                {t.viewInvoices}
              </Link>
            </Button>
          )}
        </div>
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
      </section>

      {/* Who owes you — top debtors by open balance. */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.topDebtors}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">{t.topDebtorsDesc}</p>
          </div>
          <CalendarClock className="h-4 w-4 text-neutral-300 dark:text-neutral-600" />
        </div>
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
      </section>
    </div>
  );
}
