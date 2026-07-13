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
import { getUtilization } from "@/lib/utilization";
import { addUtcDays, dayKey, startOfUtcDay, weekRange } from "@/lib/schedule";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { getLocale, getT } from "@/lib/i18n/server";

function parseWeek(value: string | undefined): Date {
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

export default async function UtilizationReportPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const { week } = await searchParams;
  const selected = parseWeek(week);
  const report = await getUtilization(organizationId, selected);

  const t = (await getT()).reports;
  const locale = await getLocale();
  const weekStart = weekRange(selected).from;
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const prevKey = dayKey(addUtcDays(weekStart, -7));
  const nextKey = dayKey(addUtcDays(weekStart, 7));
  const href = (w?: string) => (w ? `/admin/reports/utilization?week=${w}` : "/admin/reports/utilization");
  const h = (n: number) => `${n}${t.hoursShort}`;

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

      {/* Week nav */}
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="outline" size="icon" aria-label={t.prevWeek}>
          <Link href={href(prevKey)}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {t.weekOf.replace("{date}", dateFmt.format(weekStart))}
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href={href()}>{t.thisWeek}</Link>
          </Button>
        </div>
        <Button asChild variant="outline" size="icon" aria-label={t.nextWeek}>
          <Link href={href(nextKey)}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {report.rows.length === 0 ? (
            <EmptyState icon={Clock} title={t.noUtilization} description={t.noUtilizationDesc} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.colPerson}</TableHead>
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
                        {row.name}
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
