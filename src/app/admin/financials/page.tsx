import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  HandCoins,
  Landmark,
  Percent,
  PiggyBank,
  Sheet,
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
import { StatTile } from "@/components/ui/stat-tile";
import { formatInvoiceNumber } from "@/lib/invoices";
import { getCurrencySymbol } from "@/lib/currency";
import {
  FINANCIAL_PERIODS,
  getFinancials,
  normalizeFinancialPeriod,
  type FinancialPeriod,
} from "@/lib/financials";
import { requireFeature } from "@/lib/features";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getLocale, getT } from "@/lib/i18n/server";

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
  const [fin, currency, dict, locale] = await Promise.all([
    getFinancials(organizationId, period),
    getCurrencySymbol(organizationId),
    getT(),
    getLocale(),
  ]);
  const t = dict.financials;
  const money = (n: number) => `${currency}${n.toFixed(2)}`;
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

  return (
    <div className="flex flex-col gap-4">
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

      {/* Period P&L */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon={Wallet} value={money(fin.revenue)} label={t.revenue} tone="success" />
        <StatTile icon={HandCoins} value={money(fin.labor)} label={t.labor} />
        <StatTile
          icon={TrendingUp}
          value={money(fin.grossProfit)}
          label={t.grossProfit}
          tone={fin.grossProfit >= 0 ? "success" : "warning"}
        />
        <StatTile
          icon={Percent}
          value={`${fin.margin.toFixed(0)}%`}
          label={t.margin}
          tone={fin.margin >= 0 ? "default" : "warning"}
        />
        <StatTile icon={Landmark} value={money(fin.tax)} label={t.tax} />
        <StatTile
          icon={PiggyBank}
          value={money(fin.outstanding)}
          label={t.outstanding}
          tone={fin.outstanding > 0 ? "warning" : "default"}
        />
      </div>

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
    </div>
  );
}
