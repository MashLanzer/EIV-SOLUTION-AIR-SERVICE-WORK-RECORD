import Link from "next/link";
import {
  ArrowRight,
  CalendarArrowDown,
  CalendarClock,
  CalendarDays,
  Clock,
  MapPin,
  Navigation,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatTimeRange } from "@/lib/format";
import { WorkerJobCard, type WorkerJobView } from "@/components/schedule/WorkerJobCard";
import { ScheduleDayTimeline } from "@/components/schedule/ScheduleDayTimeline";
import { SheetButton } from "@/components/schedule/SheetButton";
import {
  ScheduleMonthCalendar,
  type CalendarDay,
} from "@/components/schedule/ScheduleMonthCalendar";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { getT, getLocale } from "@/lib/i18n/server";
import {
  addUtcDays,
  dayKey,
  getScheduledJobs,
  monthGridDays,
  startOfUtcDay,
  timeWindowsOverlap,
  utcDay,
} from "@/lib/schedule";

function parseDateParam(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return startOfUtcDay(new Date());
}

export default async function WorkerSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const t = (await getT()).schedule;
  const locale = await getLocale();
  const intlLocale = locale === "es" ? "es-ES" : "en-US";

  const { date } = await searchParams;
  const selected = parseDateParam(date);
  const selectedKey = dayKey(selected);
  const todayKey = dayKey(startOfUtcDay(new Date()));

  // Read the org's week-start up front so the grid range and headers line up.
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { scheduleOverloadThreshold: true, timeFormat: true, weekStartsOn: true },
  });
  const weekStart = org?.weekStartsOn ?? 1;

  const gridDays = monthGridDays(selected, weekStart);
  const from = gridDays[0];
  const to = addUtcDays(gridDays[gridDays.length - 1], 1);

  const [jobs, me] = await Promise.all([
    getScheduledJobs({ session, organizationId, from, to }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { scheduleOverloadThreshold: true },
    }),
  ]);
  // The worker's own threshold wins when set; otherwise the org default.
  const overloadThreshold =
    me?.scheduleOverloadThreshold ?? org?.scheduleOverloadThreshold ?? 4;
  const use24 = org?.timeFormat === "24";

  // Status-history timestamps for the job details sheet, formatted server-side so
  // the timeline component stays locale-agnostic (mirrors the admin schedule).
  const eventTimeFmt = new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // Canceled visits are hidden - they're not something to act on.
  type Row = WorkerJobView & { day: string };
  const rows: Row[] = jobs
    .filter((j) => j.status !== "CANCELED")
    .map((j) => ({
      id: j.id,
      title: j.title,
      notes: j.notes,
      startTime: j.startTime,
      endTime: j.endTime,
      status: j.status,
      customerName: j.customer?.name ?? null,
      customerAddress: j.customer?.address ?? null,
      customerPhone: j.customer?.phone ?? null,
      projectId: j.projectId,
      projectName: j.project?.name ?? null,
      projectAddress: j.project?.address ?? null,
      workRecordId: j.workRecordId,
      statusHistory: j.statusEvents.map((e) => ({
        status: e.status,
        actorName: e.actorName,
        time: eventTimeFmt.format(e.createdAt),
      })),
      day: dayKey(j.scheduledFor),
    }));

  const byDay = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byDay.get(r.day) ?? [];
    list.push(r);
    byDay.set(r.day, list);
  }

  const selectedMonth = selected.getUTCMonth();
  const calendarDays: CalendarDay[] = gridDays.map((d) => {
    const key = dayKey(d);
    const dayCount = (byDay.get(key) ?? []).length;
    return {
      key,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === selectedMonth,
      isToday: key === todayKey,
      isSelected: key === selectedKey,
      count: dayCount,
      overloaded: dayCount >= overloadThreshold,
    };
  });

  const selectedJobs = byDay.get(selectedKey) ?? [];

  // Flag the worker's own overlapping timed visits so the timeline can warn.
  const conflictIds = new Set<string>();
  for (let i = 0; i < selectedJobs.length; i++) {
    for (let j = i + 1; j < selectedJobs.length; j++) {
      const a = selectedJobs[i];
      const b = selectedJobs[j];
      if (timeWindowsOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
        conflictIds.add(a.id);
        conflictIds.add(b.id);
      }
    }
  }

  // Selected-day completion progress (how many of the day's visits are done).
  const doneCount = selectedJobs.filter((j) => j.status === "DONE").length;
  // Only worth a timeline when something is actually timed that day.
  const hasTimeline = selectedJobs.some((j) => j.status !== "CANCELED" && j.startTime);

  // The single nearest still-actionable visit across the fetched window, so the
  // worker sees where they're headed next no matter which day they're viewing.
  const nextVisit =
    rows
      .filter((r) => r.status !== "DONE" && r.day >= todayKey)
      .sort(
        (a, b) =>
          a.day.localeCompare(b.day) ||
          (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99")
      )[0] ?? null;
  const nextVisitAddress = nextVisit
    ? nextVisit.projectAddress || nextVisit.customerAddress
    : null;
  const nextVisitDateLabel = nextVisit
    ? nextVisit.day === todayKey
      ? t.today
      : new Intl.DateTimeFormat(intlLocale, {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }).format(new Date(`${nextVisit.day}T00:00:00.000Z`))
    : null;

  const prevMonthKey = dayKey(utcDay(selected.getUTCFullYear(), selectedMonth - 1, 1));
  const nextMonthKey = dayKey(utcDay(selected.getUTCFullYear(), selectedMonth + 1, 1));

  const monthLabel = new Intl.DateTimeFormat(intlLocale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(selected);
  const selectedDayLabel = new Intl.DateTimeFormat(intlLocale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(selected);

  const weekdayFmt = new Intl.DateTimeFormat(intlLocale, {
    weekday: "short",
    timeZone: "UTC",
  });
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    weekdayFmt.format(utcDay(2024, 0, 7 + weekStart + i))
  );

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title={t.title}
        description={t.workerSubtitle}
        action={
          <Button asChild variant="outline" size="sm">
            {/* Download endpoint (route handler), not a page - a hard <a> nav
                lets the browser handle the .ics download; Link would break it. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/records/schedule/ics">
              <CalendarArrowDown className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t.addToCalendar}</span>
            </a>
          </Button>
        }
      />

      {nextVisit && (
        <Card className="border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40">
          <CardContent className="flex flex-col gap-2 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              {t.nextVisit}
            </div>
            <div className="flex items-baseline gap-2 text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
              <span>{nextVisitDateLabel}</span>
              <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {formatTimeRange(nextVisit.startTime, nextVisit.endTime, use24, t.allDay)}
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                {nextVisit.title || t.untitled}
              </p>
              {nextVisit.customerName && (
                <p className="flex items-center gap-1 truncate text-sm text-neutral-600 dark:text-neutral-300">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-500" aria-hidden="true" />
                  {nextVisit.customerName}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <Button asChild size="sm" variant="outline">
                <Link href={`/records/schedule?date=${nextVisit.day}`}>
                  {t.viewDay}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
              {nextVisitAddress && (
                <Button asChild size="sm" variant="ghost">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(nextVisitAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                    {t.directions}
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <ScheduleMonthCalendar
        monthLabel={monthLabel}
        weekdayLabels={weekdayLabels}
        days={calendarDays}
        dayHref={(key) => `/records/schedule?date=${key}`}
        prevHref={`/records/schedule?date=${prevMonthKey}`}
        nextHref={`/records/schedule?date=${nextMonthKey}`}
        todayHref="/records/schedule"
        prevLabel={t.prevMonth}
        nextLabel={t.nextMonth}
        todayLabel={t.today}
      />

      {selectedJobs.length >= overloadThreshold && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3.5 py-2.5 text-amber-800 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm">
            {t.overloadWarningYou.replace("{n}", String(selectedJobs.length))}
          </p>
        </div>
      )}

      {/* The tall clock timeline tucks into a sheet so the day leads with the
          actual job cards instead of a screen-tall clock (mirrors admin). */}
      {hasTimeline && (
        <div className="flex flex-wrap items-stretch gap-2">
          <SheetButton label={t.timeline} icon={<Clock className="h-4 w-4" />} title={t.timeline}>
            <ScheduleDayTimeline
              jobs={selectedJobs}
              conflictIds={conflictIds}
              conflictLabel={t.conflictBadge}
              use24={use24}
            />
          </SheetButton>
        </div>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold capitalize text-neutral-900 dark:text-neutral-100">
            {selectedKey === todayKey ? `${t.today} · ${selectedDayLabel}` : selectedDayLabel}
          </h2>
          {selectedJobs.length > 0 && (
            <span className="shrink-0 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
              {t.dayProgress
                .replace("{done}", String(doneCount))
                .replace("{total}", String(selectedJobs.length))}
            </span>
          )}
        </div>
        {selectedJobs.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={CalendarDays}
                title={t.noJobsDay}
                description={t.noUpcomingDesc}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedJobs.map((job) => (
              <div key={job.id} id={`job-${job.id}`} className="scroll-mt-20">
                <WorkerJobCard job={job} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
