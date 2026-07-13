import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  CalendarArrowDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { ScheduleJobCard, type ScheduleJobView } from "@/components/schedule/ScheduleJobCard";
import { ScheduleDayTimeline } from "@/components/schedule/ScheduleDayTimeline";
import { ScheduleDayWeather } from "@/components/schedule/ScheduleDayWeather";
import { ScheduleJobForm } from "@/components/schedule/ScheduleJobForm";
import { ScheduleWorkerFilter } from "@/components/schedule/ScheduleWorkerFilter";
import {
  ScheduleMonthCalendar,
  type CalendarDay,
} from "@/components/schedule/ScheduleMonthCalendar";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { getWeather, type WeatherDay } from "@/lib/weather";
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

// Build a /admin/schedule URL that carries the current view + worker filter,
// so day taps, month/week nav and the switch never drop the filter.
function schedHref(params: {
  view?: string;
  date?: string;
  worker?: string;
  create?: boolean;
}): string {
  const p = new URLSearchParams();
  if (params.view) p.set("view", params.view);
  if (params.date) p.set("date", params.date);
  if (params.worker) p.set("worker", params.worker);
  if (params.create) p.set("new", "1");
  const qs = p.toString();
  const base = params.create
    ? "/admin/schedule#new-job"
    : "/admin/schedule";
  return qs ? `/admin/schedule?${qs}${params.create ? "#new-job" : ""}` : base;
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

// A day is "overloaded" for a worker when their non-canceled job count that day
// meets or beats their own threshold (`thresholdFor`). Returns the worst-hit
// worker's count + threshold (the one furthest over) for the calendar flag and
// the warning banner, or null when nobody's over.
function worstOverload(
  dayJobs: ScheduleJobView[],
  thresholdFor: (id: string) => number
): { count: number; threshold: number } | null {
  const byWorker = new Map<string, number>();
  for (const j of dayJobs) {
    if (!j.assignedToId || j.status === "CANCELED") continue;
    byWorker.set(j.assignedToId, (byWorker.get(j.assignedToId) ?? 0) + 1);
  }
  let worst: { count: number; threshold: number } | null = null;
  for (const [id, count] of byWorker) {
    const threshold = thresholdFor(id);
    if (count >= threshold && (!worst || count - threshold > worst.count - worst.threshold)) {
      worst = { count, threshold };
    }
  }
  return worst;
}

// Best-effort weather for one day: find the first jobsite (project) that day
// with coordinates, fetch its forecast, and return the entry for that date.
// Returns null when nothing's geocoded or the day is past the forecast window.
async function getDayWeather(
  organizationId: string,
  dayJobs: ScheduleJobView[],
  dayIso: string
): Promise<{ day: WeatherDay; placeLabel: string } | null> {
  const projectIds = [...new Set(dayJobs.map((j) => j.projectId).filter((id): id is string => !!id))];
  if (projectIds.length === 0) return null;

  const project = await prisma.project.findFirst({
    where: { organizationId, id: { in: projectIds }, latitude: { not: null }, longitude: { not: null } },
    select: { name: true, latitude: true, longitude: true },
  });
  if (!project?.latitude || !project?.longitude) return null;

  const weather = await getWeather(project.latitude, project.longitude);
  const day = weather?.days.find((d) => d.date === dayIso);
  if (!day) return null;
  return { day, placeLabel: project.name };
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string; worker?: string; new?: string }>;
}) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const t = (await getT()).schedule;
  const locale = await getLocale();
  const intlLocale = locale === "es" ? "es-ES" : "en-US";

  const { date, view: viewParam, worker: workerParam, new: newParam } = await searchParams;
  const view =
    viewParam === "week"
      ? "week"
      : viewParam === "day"
        ? "day"
        : viewParam === "team"
          ? "team"
          : "month";
  const worker = workerParam?.trim() || undefined;
  const formOpen = newParam === "1";
  const selected = parseDateParam(date);
  const selectedKey = dayKey(selected);
  const todayKey = dayKey(startOfUtcDay(new Date()));

  // Month view fetches the whole 6-week grid (so the calendar can show per-day
  // activity); week view its 7 days; day view just the one. Either way, one query.
  const gridDays = monthGridDays(selected);
  let from: Date;
  let to: Date;
  if (view === "day") {
    from = selected;
    to = addUtcDays(selected, 1);
  } else if (view === "week" || view === "team") {
    const range = weekRange(selected);
    from = range.from;
    to = range.to;
  } else {
    from = gridDays[0];
    to = addUtcDays(gridDays[gridDays.length - 1], 1);
  }

  const [jobs, workers, teams, customers, projects, org] = await Promise.all([
    getScheduledJobs({ session, organizationId, from, to, assignedToId: worker }),
    prisma.user.findMany({
      where: { organizationId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, scheduleOverloadThreshold: true },
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
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { scheduleOverloadThreshold: true },
    }),
  ]);
  // Each worker's effective overload threshold: their personal override when
  // set, otherwise the org default. A single lookup used by every view.
  const orgOverloadDefault = org?.scheduleOverloadThreshold ?? 4;
  const workerThreshold = new Map(workers.map((w) => [w.id, w.scheduleOverloadThreshold]));
  const thresholdFor = (id: string) => workerThreshold.get(id) ?? orgOverloadDefault;

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

  // The create form opens on the selected day (so "Schedule for this day"
  // lands there); for a plain week visit with no selection it falls to today.
  const formDefaultDate = selectedKey;

  // Day view: best-effort weather for the selected day at its first geocoded
  // jobsite. Only fetched in day view, and only shown when the day falls inside
  // the short forecast window (getDayWeather returns null otherwise).
  const dayWeather =
    view === "day" ? await getDayWeather(organizationId, byDay.get(selectedKey) ?? [], selectedKey) : null;

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
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t.title}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.subtitle}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={worker ? `/admin/schedule/ics?worker=${worker}` : "/admin/schedule/ics"}>
            <CalendarArrowDown className="h-4 w-4" />
            <span className="hidden sm:inline">{t.addToCalendar}</span>
          </a>
        </Button>
      </div>

      {/* View switch + worker filter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedNav
          ariaLabel={t.title}
          items={[
            { label: t.month, href: schedHref({ view: "month", date: selectedKey, worker }), active: view === "month" },
            { label: t.week, href: schedHref({ view: "week", date: selectedKey, worker }), active: view === "week" },
            { label: t.day, href: schedHref({ view: "day", date: selectedKey, worker }), active: view === "day" },
            { label: t.teamView, href: schedHref({ view: "team", date: selectedKey, worker }), active: view === "team" },
          ]}
        />
        <ScheduleWorkerFilter workers={workers} />
      </div>

      {/* New job (collapsed by default; opens when ?new=1, e.g. via the
          "Schedule for this day" CTA on an empty day) */}
      <Card id="new-job" className="scroll-mt-4">
        <details className="group" open={formOpen}>
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
          worker={worker}
          workers={workers}
          teams={teams}
          customers={customers}
          projects={projects}
          thresholdFor={thresholdFor}
          monthLabel={intl.month.format(selected)}
          weekdayLabels={weekdayLabels}
          selectedDayLabel={intl.dayLong.format(selected)}
          count={count}
          t={t}
        />
      ) : view === "day" ? (
        <DayView
          selected={selected}
          selectedKey={selectedKey}
          todayKey={todayKey}
          byDay={byDay}
          worker={worker}
          workers={workers}
          teams={teams}
          customers={customers}
          projects={projects}
          thresholdFor={thresholdFor}
          dayLabel={intl.dayLong.format(selected)}
          weather={dayWeather}
          count={count}
          t={t}
        />
      ) : view === "team" ? (
        <TeamView
          from={from}
          todayKey={todayKey}
          byDay={byDay}
          worker={worker}
          workers={workers}
          thresholdFor={thresholdFor}
          weekOfFmt={intl.weekOf}
          weekdayFmt={intl.weekday}
          t={t}
        />
      ) : (
        <WeekView
          from={from}
          todayKey={todayKey}
          byDay={byDay}
          worker={worker}
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

// A compact stat tile for the month summary, matching the dashboard tiles.
function SummaryTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
      <span className="truncate text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {value}
      </span>
      <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
      {sub && (
        <span className="text-[11px] tabular-nums text-neutral-400 dark:text-neutral-500">{sub}</span>
      )}
    </div>
  );
}

// Totals for the selected month (non-canceled jobs only): how many, what share
// are done, and who's carrying the most visits.
function monthSummary(monthJobs: ScheduleJobView[]) {
  const total = monthJobs.length;
  const done = monthJobs.filter((j) => j.status === "DONE").length;
  const donePct = total > 0 ? Math.round((done / total) * 100) : 0;
  const byWorker = new Map<string, number>();
  for (const j of monthJobs) {
    if (!j.assignedToName) continue;
    byWorker.set(j.assignedToName, (byWorker.get(j.assignedToName) ?? 0) + 1);
  }
  let busiest: { name: string; count: number } | null = null;
  for (const [name, count] of byWorker) {
    if (!busiest || count > busiest.count) busiest = { name, count };
  }
  return { total, done, donePct, busiest };
}

function MonthView({
  selected,
  selectedKey,
  todayKey,
  gridDays,
  byDay,
  worker,
  workers,
  teams,
  customers,
  projects,
  thresholdFor,
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
  worker?: string;
  workers: Opt[];
  teams: Opt[];
  customers: Opt[];
  projects: Opt[];
  thresholdFor: (id: string) => number;
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
      overloaded: worstOverload(dayJobs, thresholdFor) !== null,
    };
  });
  const selectedJobs = byDay.get(selectedKey) ?? [];
  const conflictIds = conflictingIds(selectedJobs);
  const overload = worstOverload(selectedJobs, thresholdFor);
  const prevMonthKey = dayKey(utcDay(selected.getUTCFullYear(), selectedMonth - 1, 1));
  const nextMonthKey = dayKey(utcDay(selected.getUTCFullYear(), selectedMonth + 1, 1));

  // Month totals from only the days that belong to the selected month.
  const monthJobs = gridDays
    .filter((d) => d.getUTCMonth() === selectedMonth)
    .flatMap((d) => byDay.get(dayKey(d)) ?? [])
    .filter((j) => j.status !== "CANCELED");
  const summary = monthSummary(monthJobs);

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <SummaryTile label={t.summaryJobs} value={String(summary.total)} />
        <SummaryTile
          label={t.summaryCompleted}
          value={`${summary.donePct}%`}
          sub={`${summary.done}/${summary.total}`}
        />
        <SummaryTile
          label={t.summaryBusiest}
          value={summary.busiest?.name ?? "—"}
          sub={summary.busiest ? count(summary.busiest.count) : undefined}
        />
      </div>
      <ScheduleMonthCalendar
        monthLabel={monthLabel}
        weekdayLabels={weekdayLabels}
        days={calendarDays}
        dayHref={(key) => schedHref({ view: "month", date: key, worker })}
        prevHref={schedHref({ view: "month", date: prevMonthKey, worker })}
        nextHref={schedHref({ view: "month", date: nextMonthKey, worker })}
        todayHref={schedHref({ view: "month", worker })}
        prevLabel={t.prevMonth}
        nextLabel={t.nextMonth}
        todayLabel={t.today}
      />
      {overload && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3.5 py-2.5 text-amber-800 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm">
            {t.overloadWarning
              .replace("{n}", String(overload.count))
              .replace("{threshold}", String(overload.threshold))}
          </p>
        </div>
      )}
      <DaySection
        heading={selectedKey === todayKey ? `${t.today} · ${selectedDayLabel}` : selectedDayLabel}
        jobs={selectedJobs}
        conflictIds={conflictIds}
        emptyCtaHref={schedHref({ view: "month", date: selectedKey, worker, create: true })}
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

// Single-day view: a timeline of the day's timed jobs (positioned by the
// clock) over the full, editable job list. Prev/next step one day at a time.
function DayView({
  selected,
  selectedKey,
  todayKey,
  byDay,
  worker,
  workers,
  teams,
  customers,
  projects,
  thresholdFor,
  dayLabel,
  weather,
  count,
  t,
}: {
  selected: Date;
  selectedKey: string;
  todayKey: string;
  byDay: Map<string, ScheduleJobView[]>;
  worker?: string;
  workers: Opt[];
  teams: Opt[];
  customers: Opt[];
  projects: Opt[];
  thresholdFor: (id: string) => number;
  dayLabel: string;
  weather: { day: WeatherDay; placeLabel: string } | null;
  count: (n: number) => string;
  t: SchedT;
}) {
  const dayJobs = byDay.get(selectedKey) ?? [];
  const conflictIds = conflictingIds(dayJobs);
  const overload = worstOverload(dayJobs, thresholdFor);
  const prevKey = dayKey(addUtcDays(selected, -1));
  const nextKey = dayKey(addUtcDays(selected, 1));
  const isToday = selectedKey === todayKey;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="outline" size="icon" aria-label={t.prevDay}>
          <Link href={schedHref({ view: "day", date: prevKey, worker })}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="text-sm font-medium capitalize text-neutral-900 dark:text-neutral-100">
            {dayLabel}
          </span>
          {!isToday && (
            <Button asChild variant="ghost" size="sm">
              <Link href={schedHref({ view: "day", worker })}>{t.today}</Link>
            </Button>
          )}
        </div>
        <Button asChild variant="outline" size="icon" aria-label={t.nextDay}>
          <Link href={schedHref({ view: "day", date: nextKey, worker })}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <ScheduleDayTimeline
        jobs={dayJobs}
        conflictIds={conflictIds}
        conflictLabel={t.conflictBadge}
      />

      {weather && (
        <ScheduleDayWeather day={weather.day} placeLabel={weather.placeLabel} />
      )}

      {overload && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3.5 py-2.5 text-amber-800 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="text-sm">
            {t.overloadWarning
              .replace("{n}", String(overload.count))
              .replace("{threshold}", String(overload.threshold))}
          </p>
        </div>
      )}

      <DaySection
        heading={isToday ? `${t.today} · ${dayLabel}` : dayLabel}
        jobs={dayJobs}
        conflictIds={conflictIds}
        emptyCtaHref={schedHref({ view: "day", date: selectedKey, worker, create: true })}
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

// Team view: a worker × 7-day grid for the week - one row per worker (plus an
// "unassigned" row), each cell the count of that day's non-canceled jobs.
// Overloaded cells turn amber; tapping a cell opens that worker's day. Reads
// "who's booked when" at a glance, complementing the overload alert.
function TeamView({
  from,
  todayKey,
  byDay,
  worker,
  workers,
  thresholdFor,
  weekOfFmt,
  weekdayFmt,
  t,
}: {
  from: Date;
  todayKey: string;
  byDay: Map<string, ScheduleJobView[]>;
  worker?: string;
  workers: Opt[];
  thresholdFor: (id: string) => number;
  weekOfFmt: Intl.DateTimeFormat;
  weekdayFmt: Intl.DateTimeFormat;
  t: SchedT;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addUtcDays(from, i));
  const prevKey = dayKey(addUtcDays(from, -7));
  const nextKey = dayKey(addUtcDays(from, 7));

  const counts = new Map<string, Map<string, number>>();
  const unassigned = new Map<string, number>();
  let hasUnassigned = false;
  for (const d of days) {
    const k = dayKey(d);
    for (const j of byDay.get(k) ?? []) {
      if (j.status === "CANCELED") continue;
      if (j.assignedToId) {
        let m = counts.get(j.assignedToId);
        if (!m) {
          m = new Map();
          counts.set(j.assignedToId, m);
        }
        m.set(k, (m.get(k) ?? 0) + 1);
      } else {
        unassigned.set(k, (unassigned.get(k) ?? 0) + 1);
        hasUnassigned = true;
      }
    }
  }

  const rowWorkers = worker ? workers.filter((w) => w.id === worker) : workers;
  const rows: { id: string | null; name: string }[] = [
    ...rowWorkers.map((w) => ({ id: w.id as string | null, name: w.name })),
    ...(!worker && hasUnassigned ? [{ id: null, name: t.unassignedRow }] : []),
  ];

  const gridCols = "minmax(7rem, 1fr) repeat(7, 2.75rem)";
  const cellFor = (rowId: string | null, k: string) =>
    rowId ? counts.get(rowId)?.get(k) ?? 0 : unassigned.get(k) ?? 0;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="outline" size="icon" aria-label={t.prevWeek}>
          <Link href={schedHref({ view: "team", date: prevKey, worker })}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {t.weekOf.replace("{date}", weekOfFmt.format(from))}
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href={schedHref({ view: "team", worker })}>{t.today}</Link>
          </Button>
        </div>
        <Button asChild variant="outline" size="icon" aria-label={t.nextWeek}>
          <Link href={schedHref({ view: "team", date: nextKey, worker })}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={CalendarDays} title={t.teamViewEmpty} />
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
          <div className="min-w-max">
            {/* Header: weekday + date */}
            <div className="grid" style={{ gridTemplateColumns: gridCols }}>
              <div className="sticky left-0 z-10 bg-white dark:bg-neutral-950" />
              {days.map((d) => {
                const isToday = dayKey(d) === todayKey;
                return (
                  <div
                    key={dayKey(d)}
                    className="flex flex-col items-center gap-0.5 py-2 text-[11px] tabular-nums"
                  >
                    <span className="uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                      {weekdayFmt.format(d)}
                    </span>
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full font-semibold",
                        isToday ? "bg-primary text-primary-foreground" : "text-neutral-600 dark:text-neutral-300"
                      )}
                    >
                      {d.getUTCDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            {rows.map((row) => (
              <div
                key={row.id ?? "unassigned"}
                className="grid border-t border-neutral-100 dark:border-neutral-800"
                style={{ gridTemplateColumns: gridCols }}
              >
                <div className="sticky left-0 z-10 flex items-center truncate bg-white px-3 py-2.5 text-sm text-neutral-800 dark:bg-neutral-950 dark:text-neutral-200">
                  {row.name}
                </div>
                {days.map((d) => {
                  const k = dayKey(d);
                  const n = cellFor(row.id, k);
                  if (n === 0) {
                    return (
                      <div
                        key={k}
                        className="flex items-center justify-center py-2.5 text-neutral-200 dark:text-neutral-700"
                      >
                        ·
                      </div>
                    );
                  }
                  const over = row.id != null && n >= thresholdFor(row.id);
                  return (
                    <Link
                      key={k}
                      href={schedHref({ view: "day", date: k, worker: row.id ?? undefined })}
                      className={cn(
                        "flex items-center justify-center py-2.5 text-sm font-medium tabular-nums transition-colors",
                        over
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30"
                          : "text-neutral-800 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                      )}
                    >
                      {n}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function WeekView({
  from,
  todayKey,
  byDay,
  worker,
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
  worker?: string;
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
          <Link href={schedHref({ view: "week", date: prevKey, worker })}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {t.weekOf.replace("{date}", weekOfFmt.format(from))}
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href={schedHref({ view: "week", worker })}>{t.today}</Link>
          </Button>
        </div>
        <Button asChild variant="outline" size="icon" aria-label={t.nextWeek}>
          <Link href={schedHref({ view: "week", date: nextKey, worker })}>
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
                <Link
                  href={schedHref({ view: "week", date: key, worker, create: true })}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 px-3 py-2 text-sm text-neutral-400 transition-colors hover:border-neutral-300 hover:text-neutral-600 dark:text-neutral-500 dark:hover:border-neutral-700 dark:hover:text-neutral-300"
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  {t.scheduleForDay}
                </Link>
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
  emptyCtaHref,
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
  emptyCtaHref: string;
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
          <CardContent className="flex flex-col items-center gap-3 p-0 pb-6">
            <EmptyState icon={CalendarDays} title={t.noJobsDay} description={t.noJobsWeekDesc} />
            <Button asChild size="sm">
              <Link href={emptyCtaHref}>
                <CalendarPlus className="h-4 w-4" />
                {t.scheduleForDay}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {jobs.map((job) => (
            <div key={job.id} id={`job-${job.id}`} className="scroll-mt-20">
              <ScheduleJobCard
                job={job}
                workers={workers}
                teams={teams}
                customers={customers}
                projects={projects}
                conflict={conflictIds.has(job.id)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
