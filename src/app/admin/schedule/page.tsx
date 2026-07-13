import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { ScheduleJobCard, type ScheduleJobView } from "@/components/schedule/ScheduleJobCard";
import { ScheduleJobForm } from "@/components/schedule/ScheduleJobForm";
import {
  ScheduleMonthCalendar,
  type CalendarDay,
} from "@/components/schedule/ScheduleMonthCalendar";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { getT, getLocale } from "@/lib/i18n/server";
import {
  addUtcDays,
  dayKey,
  getScheduledJobs,
  monthGridDays,
  startOfUtcDay,
  timeWindowsOverlap,
  utcDay,
  weekRange,
} from "@/lib/schedule";

function parseDateParam(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return startOfUtcDay(new Date());
}

// Flag jobs where the same worker is double-booked with an overlapping timed
// window (used to warn on the calendar, not just on save).
function conflictingIds(views: ScheduleJobView[]): Set<string> {
  const ids = new Set<string>();
  const byKey = new Map<string, ScheduleJobView[]>();
  for (const v of views) {
    if (!v.assignedToId || v.status === "CANCELED") continue;
    const k = `${v.scheduledFor}|${v.assignedToId}`;
    const list = byKey.get(k) ?? [];
    list.push(v);
    byKey.set(k, list);
  }
  for (const list of byKey.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (timeWindowsOverlap(list[i].startTime, list[i].endTime, list[j].startTime, list[j].endTime)) {
          ids.add(list[i].id);
          ids.add(list[j].id);
        }
      }
    }
  }
  return ids;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const t = (await getT()).schedule;
  const locale = await getLocale();
  const intlLocale = locale === "es" ? "es-ES" : "en-US";

  const { date, view: viewParam } = await searchParams;
  const view = viewParam === "week" ? "week" : "month";
  const selected = parseDateParam(date);
  const selectedKey = dayKey(selected);
  const todayKey = dayKey(startOfUtcDay(new Date()));

  // Month view fetches the whole 6-week grid (so the calendar can show per-day
  // activity); week view only its 7 days. Either way, one query.
  const range = view === "week" ? weekRange(selected) : null;
  const gridDays = monthGridDays(selected);
  const from = range ? range.from : gridDays[0];
  const to = range ? range.to : addUtcDays(gridDays[gridDays.length - 1], 1);

  const [jobs, workers, teams, customers, projects] = await Promise.all([
    getScheduledJobs({ session, organizationId, from, to }),
    prisma.user.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.team.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.customer.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.project.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const views: ScheduleJobView[] = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    notes: j.notes,
    scheduledFor: dayKey(j.scheduledFor),
    startTime: j.startTime,
    endTime: j.endTime,
    status: j.status,
    assignedToId: j.assignedToId,
    assignedToName: j.assignedTo?.name ?? null,
    teamId: j.teamId,
    teamName: j.team?.name ?? null,
    teamColor: j.team?.color ?? null,
    customerId: j.customerId,
    customerName: j.customer?.name ?? null,
    projectId: j.projectId,
    projectName: j.project?.name ?? null,
    workRecordId: j.workRecordId,
    workRecordJobNumber: j.workRecord?.jobNumber ?? null,
  }));

  const byDay = new Map<string, ScheduleJobView[]>();
  for (const v of views) {
    const list = byDay.get(v.scheduledFor) ?? [];
    list.push(v);
    byDay.set(v.scheduledFor, list);
  }

  const formDefaultDate = view === "week"
    ? todayKey >= dayKey(from) && todayKey < dayKey(to)
      ? todayKey
      : dayKey(from)
    : selectedKey;

  const intl = {
    month: new Intl.DateTimeFormat(intlLocale, { month: "long", year: "numeric", timeZone: "UTC" }),
    day: new Intl.DateTimeFormat(intlLocale, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
    dayLong: new Intl.DateTimeFormat(intlLocale, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }),
    weekOf: new Intl.DateTimeFormat(intlLocale, { month: "short", day: "numeric", timeZone: "UTC" }),
    weekday: new Intl.DateTimeFormat(intlLocale, { weekday: "short", timeZone: "UTC" }),
  };
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => intl.weekday.format(utcDay(2024, 0, 1 + i)));
  const count = (n: number) =>
    (n === 1 ? t.jobCountOne : t.jobCountMany).replace("{n}", String(n));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t.title}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.subtitle}</p>
        </div>
      </div>

      {/* Month / Week switch */}
      <SegmentedNav
        ariaLabel={t.title}
        items={[
          { label: t.month, href: `/admin/schedule?view=month&date=${selectedKey}`, active: view === "month" },
          { label: t.week, href: `/admin/schedule?view=week&date=${selectedKey}`, active: view === "week" },
        ]}
      />

      {/* New job (collapsed by default) */}
      <Card>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden [&::marker]:hidden">
            <span className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <CalendarPlus className="h-4 w-4" />
              {t.newJob}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4">
            <ScheduleJobForm
              defaultDate={formDefaultDate}
              workers={workers}
              teams={teams}
              customers={customers}
              projects={projects}
            />
          </div>
        </details>
      </Card>

      {view === "month" ? (
        <MonthView
          selected={selected}
          selectedKey={selectedKey}
          todayKey={todayKey}
          gridDays={gridDays}
          byDay={byDay}
          workers={workers}
          teams={teams}
          customers={customers}
          projects={projects}
          monthLabel={intl.month.format(selected)}
          weekdayLabels={weekdayLabels}
          selectedDayLabel={intl.dayLong.format(selected)}
          count={count}
          t={t}
        />
      ) : (
        <WeekView
          from={from}
          todayKey={todayKey}
          byDay={byDay}
          workers={workers}
          teams={teams}
          customers={customers}
          projects={projects}
          dayFmt={intl.day}
          weekOfFmt={intl.weekOf}
          count={count}
          t={t}
        />
      )}
    </div>
  );
}

type SchedT = Awaited<ReturnType<typeof getT>>["schedule"];
type Opt = { id: string; name: string };

function MonthView({
  selected,
  selectedKey,
  todayKey,
  gridDays,
  byDay,
  workers,
  teams,
  customers,
  projects,
  monthLabel,
  weekdayLabels,
  selectedDayLabel,
  count,
  t,
}: {
  selected: Date;
  selectedKey: string;
  todayKey: string;
  gridDays: Date[];
  byDay: Map<string, ScheduleJobView[]>;
  workers: Opt[];
  teams: Opt[];
  customers: Opt[];
  projects: Opt[];
  monthLabel: string;
  weekdayLabels: string[];
  selectedDayLabel: string;
  count: (n: number) => string;
  t: SchedT;
}) {
  const selectedMonth = selected.getUTCMonth();
  const calendarDays: CalendarDay[] = gridDays.map((d) => {
    const key = dayKey(d);
    const dayJobs = (byDay.get(key) ?? []).filter((j) => j.status !== "CANCELED");
    return {
      key,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === selectedMonth,
      isToday: key === todayKey,
      isSelected: key === selectedKey,
      count: dayJobs.length,
    };
  });
  const selectedJobs = byDay.get(selectedKey) ?? [];
  const conflictIds = conflictingIds(selectedJobs);
  const prevMonthKey = dayKey(utcDay(selected.getUTCFullYear(), selectedMonth - 1, 1));
  const nextMonthKey = dayKey(utcDay(selected.getUTCFullYear(), selectedMonth + 1, 1));

  return (
    <>
      <ScheduleMonthCalendar
        monthLabel={monthLabel}
        weekdayLabels={weekdayLabels}
        days={calendarDays}
        basePath="/admin/schedule"
        prevHref={`/admin/schedule?view=month&date=${prevMonthKey}`}
        nextHref={`/admin/schedule?view=month&date=${nextMonthKey}`}
        todayHref="/admin/schedule?view=month"
        prevLabel={t.prevMonth}
        nextLabel={t.nextMonth}
        todayLabel={t.today}
      />
      <DaySection
        heading={selectedKey === todayKey ? `${t.today} · ${selectedDayLabel}` : selectedDayLabel}
        jobs={selectedJobs}
        conflictIds={conflictIds}
        workers={workers}
        teams={teams}
        customers={customers}
        projects={projects}
        count={count}
        t={t}
      />
    </>
  );
}

function WeekView({
  from,
  todayKey,
  byDay,
  workers,
  teams,
  customers,
  projects,
  dayFmt,
  weekOfFmt,
  count,
  t,
}: {
  from: Date;
  todayKey: string;
  byDay: Map<string, ScheduleJobView[]>;
  workers: Opt[];
  teams: Opt[];
  customers: Opt[];
  projects: Opt[];
  dayFmt: Intl.DateTimeFormat;
  weekOfFmt: Intl.DateTimeFormat;
  count: (n: number) => string;
  t: SchedT;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addUtcDays(from, i));
  const prevKey = dayKey(addUtcDays(from, -7));
  const nextKey = dayKey(addUtcDays(from, 7));
  const weekViews = days.flatMap((d) => byDay.get(dayKey(d)) ?? []);
  const conflictIds = conflictingIds(weekViews);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="outline" size="icon" aria-label={t.prevWeek}>
          <Link href={`/admin/schedule?view=week&date=${prevKey}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {t.weekOf.replace("{date}", weekOfFmt.format(from))}
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/schedule?view=week">{t.today}</Link>
          </Button>
        </div>
        <Button asChild variant="outline" size="icon" aria-label={t.nextWeek}>
          <Link href={`/admin/schedule?view=week&date=${nextKey}`}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {weekViews.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={CalendarDays} title={t.noJobsWeek} description={t.noJobsWeekDesc} />
          </CardContent>
        </Card>
      ) : (
        days.map((d) => {
          const key = dayKey(d);
          const dayJobs = byDay.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <section key={key} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h2 className={"text-xs font-semibold uppercase tracking-wide " + (isToday ? "text-primary" : "text-neutral-500 dark:text-neutral-400")}>
                  {dayFmt.format(d)}
                </h2>
                {isToday && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-text">
                    {t.today}
                  </span>
                )}
                {dayJobs.length > 0 && (
                  <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">{count(dayJobs.length)}</span>
                )}
              </div>
              {dayJobs.length === 0 ? (
                <p className="rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 px-3 py-2 text-sm text-neutral-400 dark:text-neutral-500">
                  {t.noJobsDay}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {dayJobs.map((job) => (
                    <ScheduleJobCard
                      key={job.id}
                      job={job}
                      workers={workers}
                      teams={teams}
                      customers={customers}
                      projects={projects}
                      conflict={conflictIds.has(job.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </>
  );
}

function DaySection({
  heading,
  jobs,
  conflictIds,
  workers,
  teams,
  customers,
  projects,
  count,
  t,
}: {
  heading: string;
  jobs: ScheduleJobView[];
  conflictIds: Set<string>;
  workers: Opt[];
  teams: Opt[];
  customers: Opt[];
  projects: Opt[];
  count: (n: number) => string;
  t: SchedT;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold capitalize text-neutral-900 dark:text-neutral-100">{heading}</h2>
        {jobs.length > 0 && (
          <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">{count(jobs.length)}</span>
        )}
      </div>
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={CalendarDays} title={t.noJobsDay} description={t.noJobsWeekDesc} />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {jobs.map((job) => (
            <ScheduleJobCard
              key={job.id}
              job={job}
              workers={workers}
              teams={teams}
              customers={customers}
              projects={projects}
              conflict={conflictIds.has(job.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
