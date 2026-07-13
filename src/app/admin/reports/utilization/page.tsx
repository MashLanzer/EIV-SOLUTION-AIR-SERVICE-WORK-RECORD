import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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

// Small pill toggle used for both the period and grouping switches.
function Toggle({ active, label, to }: { active: boolean; label: string; to: string }) {
  return (
    <Link
      href={to}
      className={cn(
        "rounded-full px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
      )}
    >
      {label}
    </Link>
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
      <div>
        <Link
          href="/admin/reports"
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.title}
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {t.utilizationTitle}
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t.utilizationDesc}</p>
      </div>

      {/* Period + grouping toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Toggle active={period === "week"} label={t.periodWeek} to={href({ period: "week" })} />
          <Toggle active={period === "month"} label={t.periodMonth} to={href({ period: "month" })} />
        </div>
        <div className="flex items-center gap-1.5">
          <Toggle active={group === "person"} label={t.byPerson} to={href({ group: "person" })} />
          <Toggle active={group === "team"} label={t.byTeam} to={href({ group: "team" })} />
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
      <Card>
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
                      <TableCell className="text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                        {pct == null ? "—" : `${pct}%`}
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
                  <TableCell className="text-right font-semibold tabular-nums text-neutral-500 dark:text-neutral-400">
                    {usedPct(report.totals.plannedHours, report.totals.loggedHours) == null
                      ? "—"
                      : `${usedPct(report.totals.plannedHours, report.totals.loggedHours)}%`}
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
