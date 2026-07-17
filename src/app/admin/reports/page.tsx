import Link from "next/link";
import { BarChart3, ChevronDown, Clock, DollarSign, FileText, Sheet, Users } from "lucide-react";

import { BarList } from "@/components/charts/BarList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePresets } from "@/components/ui/date-presets";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterActions, FilterBar, FilterField } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PayReportTable } from "@/components/reports/PayReportTable";
import { buildPayReport, defaultPayReportRange, parsePayReportParams } from "@/lib/payReport";
import { getCurrencySymbol } from "@/lib/currency";
import { formatMoney } from "@/lib/format";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getLocale, getT } from "@/lib/i18n/server";

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}) {
  const session = await requirePermission("reports.view");
  const { dateFrom, dateTo } = parsePayReportParams(await searchParams);
  const report = await buildPayReport({ dateFrom, dateTo }, requireOrgId(session));
  const currency = await getCurrencySymbol(requireOrgId(session));
  const def = defaultPayReportRange();
  const isCustomRange = dateFrom !== def.dateFrom || dateTo !== def.dateTo;

  const t = (await getT()).reports;
  const locale = await getLocale();
  const moneyString = (value: number) => formatMoney(value, currency);
  const money = (value: number) => (
    <span className="tabular-nums">{moneyString(value)}</span>
  );

  // Pay per person, biggest first, for the at-a-glance bar chart above the table.
  const chartData = [...report.rows]
    .sort((a, b) => b.total - a.total)
    .map((row) => ({ label: row.name, value: row.total }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.title}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/reports/utilization">
              <Clock className="h-4 w-4" />
              {t.utilization}
            </Link>
          </Button>
        }
      />

      {/* Headline totals for the selected range - the payout number an admin
          actually cares about, up top instead of buried in the table's last
          row. On mobile the money "Total to pay" gets its own full-width row
          (so the figure has room), with the two count tiles side by side
          under it; on desktop all three sit in a row. */}
      <div className="grid animate-fade-up grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <DollarSign className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                {money(report.grand.total)}
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                {t.totalToPay}
              </div>
              {report.grand.jobs > 0 && (
                <div className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                  {t.avgPerJob}: {moneyString(report.grand.total / report.grand.jobs)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-3 sm:p-4">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent sm:flex">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 sm:text-2xl">
                {report.grand.jobs}
              </div>
              <div className="truncate text-xs text-neutral-500 dark:text-neutral-400 sm:text-sm">
                {t.jobPayments}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-3 sm:p-4">
            <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent sm:flex">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 sm:text-2xl">
                {report.rows.length}
              </div>
              <div className="truncate text-xs text-neutral-500 dark:text-neutral-400 sm:text-sm">
                {t.peoplePaid}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        {/* Collapsed by default so the date form doesn't eat the screen -
            unlike Records' filters, this range always has a value (it
            defaults to the current month), so "has a value" can't be the
            open/closed signal; it opens instead when the range differs
            from that default. */}
        <details className="group" open={isCustomRange}>
          <summary className="flex cursor-pointer list-none flex-col gap-1 p-4 [&::-webkit-details-marker]:hidden [&::marker]:hidden">
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {t.dateRange}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400 transition-transform group-open:rotate-180" />
            </div>
            <span className="text-sm tabular-nums text-neutral-500 dark:text-neutral-400">
              {formatDate(dateFrom, locale)} – {formatDate(dateTo, locale)}
            </span>
          </summary>
          <div className="px-4 pb-4">
            <FilterBar>
              <div className="col-span-2 sm:col-span-6">
                <DatePresets />
              </div>
              <FilterField label={t.from} htmlFor="dateFrom">
                <Input id="dateFrom" name="dateFrom" type="date" defaultValue={dateFrom} />
              </FilterField>
              <FilterField label={t.to} htmlFor="dateTo">
                <Input id="dateTo" name="dateTo" type="date" defaultValue={dateTo} />
              </FilterField>
              <FilterActions>
                <Button type="submit" variant="outline" size="default">
                  {t.apply}
                </Button>
              </FilterActions>
            </FilterBar>
          </div>
        </details>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {(report.recordCount === 1 ? t.approvedCountOne : t.approvedCountMany).replace("{n}", String(report.recordCount))}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t.pendingNote}
            </p>
          </div>
          <form method="GET" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="dateFrom" value={dateFrom} />
            <input type="hidden" name="dateTo" value={dateTo} />
            <Button type="submit" variant="outline" size="sm" formAction="/admin/reports/export/pdf">
              <FileText className="h-4 w-4" />
              {t.exportPdf}
            </Button>
            <Button type="submit" variant="outline" size="sm" formAction="/admin/reports/export">
              <Sheet className="h-4 w-4" />
              {t.exportExcel}
            </Button>
          </form>
        </div>

        {report.rows.length > 1 && (
          <Card>
            <CardContent className="flex flex-col gap-3 p-4">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {t.payByPerson}
              </h3>
              <BarList data={chartData} formatValue={moneyString} labelWidth="7rem" />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {report.rows.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title={t.noRecords}
                description={t.noRecordsDesc}
              />
            ) : (
              <PayReportTable
                rows={report.rows}
                grand={report.grand}
                currency={currency}
                dateFrom={dateFrom}
                dateTo={dateTo}
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
