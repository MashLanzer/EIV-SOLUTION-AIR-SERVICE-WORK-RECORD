import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getUtilization,
  periodRange,
  shiftPeriod,
  type UtilGroup,
  type UtilPeriod,
} from "@/lib/utilization";
import { dayKey, startOfUtcDay } from "@/lib/schedule";
import { requireOrgId } from "@/lib/orgScope";
import { requireReviewer } from "@/lib/session";
import { getLocale, getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

function parseDate(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return startOfUtcDay(new Date());
}

// logged / planned as a percentage, or null when nothing was planned.
function usedPct(planned: number, logged: number): number | null {
  if (planned <= 0) return null;
  return Math.round((logged / planned) * 100);
}

// The utilization % as a number plus a thin proportional bar, so a reviewer
// can scan the column at a glance. The bar caps its fill at 100% (anything
// over planned still reads as "full") and hides on narrow screens to keep
// the table compact.
function UtilCell({ pct, strong }: { pct: number | null; strong?: boolean }) {
  const fill = pct == null ? 0 : Math.min(pct, 100);
  return (
    <div className="flex items-center justify-end gap-2">
      <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800 sm:block">
        <div
          className="h-full rounded-full bg-neutral-900 dark:bg-neutral-100"
          style={{ width: `${fill}%` }}
        />
      </div>
      <span
        className={cn(
          "tabular-nums",
          strong
            ? "font-semibold text-neutral-900 dark:text-neutral-100"
            : "text-neutral-500 dark:text-neutral-400"
        )}
      >
        {pct == null ? "—" : `${pct}%`}
      </span>
    </div>
  );
}

export default async function UtilizationReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; period?: string; group?: string }>;
}) {
  const session = await requireReviewer();
  const organizationId = requireOrgId(session);
  const sp = await searchParams;
  const period: UtilPeriod = sp.period === "month" ? "month" : "week";
  const group: UtilGroup = sp.group === "team" ? "team" : "person";
  const selected = parseDate(sp.date);
  const report = await getUtilization(organizationId, selected, { period, group });

  const t = (await getT()).reports;
  const locale = await getLocale();
  const intlLocale = locale === "es" ? "es-ES" : "en-US";
  const start = report.from;
  const dayFmt = new Intl.DateTimeFormat(intlLocale, { month: "short", day: "numeric", timeZone: "UTC" });
  const monthFmt = new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric", timeZone: "UTC" });
  const trendFmt = new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    ...(period === "week" ? { day: "numeric" } : {}),
    timeZone: "UTC",
  });

  const periodLabel =
    period === "month"
      ? t.monthOf.replace("{date}", monthFmt.format(start))
      : t.weekOf.replace("{date}", dayFmt.format(start));

  const prevKey = dayKey(periodRange(shiftPeriod(start, period, -1), period).from);
  const nextKey = dayKey(periodRange(shiftPeriod(start, period, 1), period).from);
  const href = (params: { date?: string; period?: UtilPeriod; group?: UtilGroup }) => {
    const q = new URLSearchParams();
    if (params.date) q.set("date", params.date);
    if ((params.period ?? period) !== "week") q.set("period", params.period ?? period);
    if ((params.group ?? group) !== "person") q.set("group", params.group ?? group);
    const s = q.toString();
    return `/admin/reports/utilization${s ? `?${s}` : ""}`;
  };
  const h = (n: number) => `${n}${t.hoursShort}`;
  const rowName = (name: string) => (name === "__none__" ? t.noTeam : name);

  const trendMax = Math.max(
    1,
    ...report.trend.map((p) => Math.max(p.plannedHours, p.loggedHours))
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        backHref="/admin/reports"
        backLabel={t.title}
        title={t.utilizationTitle}
        description={t.utilizationDesc}
      />

      {/* Period + grouping toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <FilterChip active={period === "week"} href={href({ period: "week" })}>
            {t.periodWeek}
          </FilterChip>
          <FilterChip active={period === "month"} href={href({ period: "month" })}>
            {t.periodMonth}
          </FilterChip>
        </div>
        <div className="flex items-center gap-1.5">
          <FilterChip active={group === "person"} href={href({ group: "person" })}>
            {t.byPerson}
          </FilterChip>
          <FilterChip active={group === "team"} href={href({ group: "team" })}>
            {t.byTeam}
          </FilterChip>
        </div>
      </div>

      {/* Period nav */}
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="outline" size="icon" aria-label={t.prevWeek}>
          <Link href={href({ date: prevKey })}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {periodLabel}
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href={href({})}>{t.thisWeek}</Link>
          </Button>
        </div>
        <Button asChild variant="outline" size="icon" aria-label={t.nextWeek}>
          <Link href={href({ date: nextKey })}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Trend: planned (light) vs logged (dark) totals over trailing periods */}
      <Card className="animate-fade-up">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.trendTitle}
            </span>
            <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-neutral-300 dark:bg-neutral-600" />
                {t.plannedHours}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-neutral-900 dark:bg-neutral-100" />
                {t.loggedHours}
              </span>
            </div>
          </div>
          <div className="flex h-24 items-end justify-between gap-1.5">
            {report.trend.map((p, i) => {
              const isCurrent = i === report.trend.length - 1;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-16 w-full items-end justify-center gap-0.5">
                    <div
                      className="w-1/2 rounded-t-sm bg-neutral-300 dark:bg-neutral-600"
                      style={{ height: `${(p.plannedHours / trendMax) * 100}%` }}
                      title={`${t.plannedHours}: ${h(p.plannedHours)}`}
                    />
                    <div
                      className="w-1/2 rounded-t-sm bg-neutral-900 dark:bg-neutral-100"
                      style={{ height: `${(p.loggedHours / trendMax) * 100}%` }}
                      title={`${t.loggedHours}: ${h(p.loggedHours)}`}
                    />
                  </div>
                  <span
                    className={cn(
                      "truncate text-[10px]",
                      isCurrent
                        ? "font-semibold text-neutral-700 dark:text-neutral-200"
                        : "text-neutral-400 dark:text-neutral-500"
                    )}
                  >
                    {trendFmt.format(p.from)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {report.rows.length === 0 ? (
            <EmptyState icon={Clock} title={t.noUtilization} description={t.noUtilizationDesc} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{group === "team" ? t.byTeam : t.colPerson}</TableHead>
                  <TableHead className="text-right">{t.plannedHours}</TableHead>
                  <TableHead className="text-right">{t.loggedHours}</TableHead>
                  <TableHead className="text-right">{t.utilizationPct}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.rows.map((row) => {
                  const pct = usedPct(row.plannedHours, row.loggedHours);
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                        {rowName(row.name)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{h(row.plannedHours)}</TableCell>
                      <TableCell className="text-right tabular-nums">{h(row.loggedHours)}</TableCell>
                      <TableCell className="text-right">
                        <UtilCell pct={pct} />
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-neutral-50 dark:bg-neutral-800">
                  <TableCell className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {t.grandTotal}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {h(report.totals.plannedHours)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {h(report.totals.loggedHours)}
                  </TableCell>
                  <TableCell className="text-right">
                    <UtilCell
                      pct={usedPct(report.totals.plannedHours, report.totals.loggedHours)}
                      strong
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
