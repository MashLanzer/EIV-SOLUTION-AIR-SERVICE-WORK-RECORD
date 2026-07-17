import Link from "next/link";
import type { ScheduledJobStatus } from "@prisma/client";
import {
  CalendarDays,
  CalendarPlus,
  CalendarArrowDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Navigation,
  Route,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { StatTile } from "@/components/ui/stat-tile";
import { ScheduleJobCard, type ScheduleJobView } from "@/components/schedule/ScheduleJobCard";
import { ScheduleDayTimeline } from "@/components/schedule/ScheduleDayTimeline";
import { ScheduleDayWeather } from "@/components/schedule/ScheduleDayWeather";
import { NewScheduledJobButton } from "@/components/schedule/NewScheduledJobButton";
import { StartRecordSheet } from "@/components/schedule/StartRecordSheet";
import { DaySheet } from "@/components/schedule/DaySheet";
import { SheetButton } from "@/components/schedule/SheetButton";
import { SuccessToast } from "@/components/ui/success-toast";
import { ScheduleWorkerFilter } from "@/components/schedule/ScheduleWorkerFilter";
import { loadNewRecordFormData } from "@/lib/newRecordForm";
import { WeekBoard } from "@/components/schedule/WeekBoard";
import {
  ScheduleMonthCalendar,
  type CalendarDay,
} from "@/components/schedule/ScheduleMonthCalendar";
import { cn } from "@/lib/utils";
import { getSkillSuggestions } from "@/lib/orgSkills";
import { SCHEDULED_JOB_STATUSES } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getWeather, type WeatherDay } from "@/lib/weather";
import { orderByRoute } from "@/lib/route";
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

// Build a /admin/schedule URL that carries the current view + worker + status
// filter, so day taps, month/week nav and the switch never drop the filter.
function schedHref(params: {
  view?: string;
  date?: string;
  worker?: string;
  status?: string;
  create?: boolean;
  // Opens the tapped day's jobs in a bottom sheet (month view) instead of
  // stacking them under the calendar.
  day?: boolean;
}): string {
  const p = new URLSearchParams();
  if (params.view) p.set("view", params.view);
  if (params.date) p.set("date", params.date);
  if (params.worker) p.set("worker", params.worker);
  if (params.status) p.set("status", params.status);
  if (params.create) p.set("new", "1");
  if (params.day) p.set("day", "1");
  const qs = p.toString();
  // ?new=1 opens the "new job" bottom sheet (read from the query by
  // NewScheduledJobButton), pre-filled with the day carried in ?date=.
  return qs ? `/admin/schedule?${qs}` : "/admin/schedule";
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

export type DayRoute = {
  stops: { id: string; title: string; place: string; lat: number; lng: number }[];
  mapsUrl: string;
};

// Suggested driving order for the day's geocoded jobsites: nearest-neighbour
// from the first job, plus a Google Maps link chaining every stop. Null when
// fewer than two of the day's jobs have a geocoded project.
async function getDayRoute(
  organizationId: string,
  dayJobs: ScheduleJobView[]
): Promise<DayRoute | null> {
  const withProject = dayJobs.filter((j) => j.status !== "CANCELED" && j.projectId);
  const projectIds = [...new Set(withProject.map((j) => j.projectId as string))];
  if (projectIds.length === 0) return null;

  const projects = await prisma.project.findMany({
    where: {
      organizationId,
      id: { in: projectIds },
      latitude: { not: null },
      longitude: { not: null },
    },
    select: { id: true, latitude: true, longitude: true, name: true },
  });
  const coord = new Map(projects.map((p) => [p.id, p]));

  const points = withProject
    .map((j) => {
      const p = coord.get(j.projectId as string);
      return p
        ? { id: j.id, title: j.title, place: p.name, lat: p.latitude as number, lng: p.longitude as number }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  if (points.length < 2) return null;

  const stops = orderByRoute(points);
  const mapsUrl = `https://www.google.com/maps/dir/${stops
    .map((s) => `${s.lat},${s.lng}`)
    .join("/")}`;
  return { stops, mapsUrl };
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    view?: string;
    worker?: string;
    status?: string;
    new?: string;
    record?: string;
    saved?: string;
  }>;
}) {
  const session = await requirePermission("schedule.manage");
  const organizationId = requireOrgId(session);
  const t = (await getT()).schedule;
  const locale = await getLocale();
  const intlLocale = locale === "es" ? "es-ES" : "en-US";

  const {
    date,
    view: viewParam,
    worker: workerParam,
    status: statusParam,
    record: recordJobId,
    saved: savedParam,
  } = await searchParams;
  const view =
    viewParam === "week"
      ? "week"
      : viewParam === "day"
        ? "day"
        : viewParam === "team"
          ? "team"
          : "month";
  const worker = workerParam?.trim() || undefined;
  // Optional lifecycle filter (chips). Only a valid enum value counts; anything
  // else falls back to "all". Applied to the fetched jobs below so every view
  // (month counts, day list, week board, team grid) reflects the same filter.
  const statusFilter = (SCHEDULED_JOB_STATUSES as readonly string[]).includes(statusParam ?? "")
    ? (statusParam as ScheduledJobStatus)
    : undefined;
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

  const [jobs, workers, teams, customers, projects, org, skillRows, skillSuggestions] = await Promise.all([
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
    prisma.userSkill.findMany({
      where: { user: { organizationId } },
      select: { userId: true, name: true },
      orderBy: { name: "asc" },
    }),
    getSkillSuggestions(organizationId),
  ]);
  // Each worker's effective overload threshold: their personal override when
  // set, otherwise the org default. A single lookup used by every view.
  const orgOverloadDefault = org?.scheduleOverloadThreshold ?? 4;
  const workerThreshold = new Map(workers.map((w) => [w.id, w.scheduleOverloadThreshold]));
  const thresholdFor = (id: string) => workerThreshold.get(id) ?? orgOverloadDefault;

  // Skills per worker (for the assignment star + required-skill mismatch). The
  // required-skill autocomplete uses skillSuggestions (catalog + in use).
  const workerSkills: Record<string, string[]> = {};
  for (const row of skillRows) {
    (workerSkills[row.userId] ??= []).push(row.name);
  }
  const workerHasSkill = (workerId: string, skill: string) =>
    (workerSkills[workerId] ?? []).some((s) => s.toLowerCase() === skill.toLowerCase());

  // Timestamp format for the status-history trail (local clock, short date).
  const eventTimeFmt = new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const views: ScheduleJobView[] = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    notes: j.notes,
    scheduledFor: dayKey(j.scheduledFor),
    startTime: j.startTime,
    endTime: j.endTime,
    requiredSkill: j.requiredSkill,
    // A mismatch: the job needs a skill but the assigned worker doesn't have it.
    skillMismatch: !!j.requiredSkill && !!j.assignedToId && !workerHasSkill(j.assignedToId, j.requiredSkill),
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
    statusHistory: j.statusEvents.map((e) => ({
      status: e.status,
      actorName: e.actorName,
      time: eventTimeFmt.format(e.createdAt),
    })),
  }));

  // Apply the lifecycle chip filter (if any) once, so every view downstream
  // works off the same filtered set.
  const shownViews = statusFilter ? views.filter((v) => v.status === statusFilter) : views;

  const byDay = new Map<string, ScheduleJobView[]>();
  for (const v of shownViews) {
    const list = byDay.get(v.scheduledFor) ?? [];
    list.push(v);
    byDay.set(v.scheduledFor, list);
  }

  // Non-canceled job count per day per worker, so the new-job form can rank
  // skill-matched workers by who's least busy that day. Covers the fetched
  // range; days outside it just show no load (treated as 0).
  const loadByDay: Record<string, Record<string, number>> = {};
  for (const [key, list] of byDay) {
    const counts: Record<string, number> = {};
    for (const j of list) {
      if (j.status === "CANCELED" || !j.assignedToId) continue;
      counts[j.assignedToId] = (counts[j.assignedToId] ?? 0) + 1;
    }
    loadByDay[key] = counts;
  }

  // The create form opens on the selected day (so "Schedule for this day"
  // lands there); for a plain week visit with no selection it falls to today.
  const formDefaultDate = selectedKey;

  // Day view: best-effort weather for the selected day at its first geocoded
  // jobsite. Only fetched in day view, and only shown when the day falls inside
  // the short forecast window (getDayWeather returns null otherwise).
  const dayWeather =
    view === "day" ? await getDayWeather(organizationId, byDay.get(selectedKey) ?? [], selectedKey) : null;
  const dayRoute =
    view === "day" ? await getDayRoute(organizationId, byDay.get(selectedKey) ?? []) : null;

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

  // "Start record" from a job card opens the office record form in a bottom
  // sheet (?record=<jobId>). The heavier form data is fetched only when the
  // param is present, so it costs nothing on a normal calendar view.
  const recordFormData = recordJobId
    ? await loadNewRecordFormData(session, organizationId, recordJobId)
    : null;
  const recordSavedMsg = (await getT()).records.recordSaved;

  return (
    <div className="flex flex-col gap-4">
      {recordFormData && (
        <StartRecordSheet
          data={recordFormData}
          storedSignature={session.user.storedSignature}
        />
      )}
      {savedParam && <SuccessToast message={recordSavedMsg} aboveMobileNav />}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t.title}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={worker ? `/admin/schedule/ics?worker=${worker}` : "/admin/schedule/ics"}>
              <CalendarArrowDown className="h-4 w-4" />
              <span className="hidden sm:inline">{t.addToCalendar}</span>
            </a>
          </Button>
          <NewScheduledJobButton
            defaultDate={formDefaultDate}
            workers={workers}
            teams={teams}
            customers={customers}
            projects={projects}
            workerSkills={workerSkills}
            skillSuggestions={skillSuggestions}
            loadByDay={loadByDay}
          />
        </div>
      </div>

      {/* View switch + worker filter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedNav
          ariaLabel={t.title}
          items={[
            { label: t.month, href: schedHref({ view: "month", date: selectedKey, worker, status: statusFilter }), active: view === "month" },
            { label: t.week, href: schedHref({ view: "week", date: selectedKey, worker, status: statusFilter }), active: view === "week" },
            { label: t.day, href: schedHref({ view: "day", date: selectedKey, worker, status: statusFilter }), active: view === "day" },
            { label: t.teamView, href: schedHref({ view: "team", date: selectedKey, worker, status: statusFilter }), active: view === "team" },
          ]}
        />
        <ScheduleWorkerFilter workers={workers} />
      </div>

      {/* Lifecycle filter chips — narrow the calendar to one status at a time. */}
      <nav aria-label={t.filterByStatus} className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
        {(
          [
            { value: undefined, label: t.filterAll },
            { value: "SCHEDULED", label: t.statusScheduled },
            { value: "STARTED", label: t.statusStarted },
            { value: "EN_ROUTE", label: t.statusEnRoute },
            { value: "IN_PROGRESS", label: t.statusInProgress },
            { value: "DONE", label: t.statusDone },
            { value: "CANCELED", label: t.statusCanceled },
          ] as { value?: ScheduledJobStatus; label: string }[]
        ).map((chip) => {
          const active = statusFilter === chip.value;
          return (
            <Link
              key={chip.value ?? "all"}
              href={schedHref({ view, date: selectedKey, worker, status: chip.value })}
              aria-current={active ? "true" : undefined}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:text-neutral-100"
              )}
            >
              {chip.label}
            </Link>
          );
        })}
      </nav>

      {view === "month" ? (
        <MonthView
          selected={selected}
          selectedKey={selectedKey}
          todayKey={todayKey}
          gridDays={gridDays}
          byDay={byDay}
          worker={worker}
          statusFilter={statusFilter}
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
          statusFilter={statusFilter}
          workers={workers}
          teams={teams}
          customers={customers}
          projects={projects}
          thresholdFor={thresholdFor}
          dayLabel={intl.dayLong.format(selected)}
          weather={dayWeather}
          route={dayRoute}
          count={count}
          t={t}
        />
      ) : view === "team" ? (
        <TeamView
          from={from}
          todayKey={todayKey}
          byDay={byDay}
          worker={worker}
          statusFilter={statusFilter}
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
          statusFilter={statusFilter}
          workers={workers}
          teams={teams}
          customers={customers}
          projects={projects}
          dayFmt={intl.day}
          weekOfFmt={intl.weekOf}
          t={t}
        />
      )}
    </div>
  );
}

type SchedT = Awaited<ReturnType<typeof getT>>["schedule"];
type Opt = { id: string; name: string };

// A compact stat tile for the month summary, matching the dashboard tiles.
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
  statusFilter,
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
  statusFilter?: ScheduledJobStatus;
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
      <div className="grid animate-fade-up grid-cols-3 gap-3 sm:gap-4">
        <StatTile label={t.summaryJobs} value={String(summary.total)} />
        <StatTile
          label={t.summaryCompleted}
          value={`${summary.donePct}%`}
          sub={`${summary.done}/${summary.total}`}
        />
        <StatTile
          label={t.summaryBusiest}
          value={summary.busiest?.name ?? "—"}
          sub={summary.busiest ? count(summary.busiest.count) : undefined}
        />
      </div>
      <ScheduleMonthCalendar
        monthLabel={monthLabel}
        weekdayLabels={weekdayLabels}
        days={calendarDays}
        dayHref={(key) => schedHref({ view: "month", date: key, worker, status: statusFilter, day: true })}
        prevHref={schedHref({ view: "month", date: prevMonthKey, worker, status: statusFilter })}
        nextHref={schedHref({ view: "month", date: nextMonthKey, worker, status: statusFilter })}
        todayHref={schedHref({ view: "month", worker, status: statusFilter })}
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
      <DaySheet
        title={selectedKey === todayKey ? `${t.today} · ${selectedDayLabel}` : selectedDayLabel}
      >
        <DaySection
          heading={selectedKey === todayKey ? `${t.today} · ${selectedDayLabel}` : selectedDayLabel}
          jobs={selectedJobs}
          conflictIds={conflictIds}
          emptyCtaHref={schedHref({ view: "month", date: selectedKey, worker, status: statusFilter, create: true })}
          workers={workers}
          teams={teams}
          customers={customers}
          projects={projects}
          count={count}
          t={t}
          hideHeading
        />
      </DaySheet>
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
  statusFilter,
  workers,
  teams,
  customers,
  projects,
  thresholdFor,
  dayLabel,
  weather,
  route,
  count,
  t,
}: {
  selected: Date;
  selectedKey: string;
  todayKey: string;
  byDay: Map<string, ScheduleJobView[]>;
  worker?: string;
  statusFilter?: ScheduledJobStatus;
  workers: Opt[];
  teams: Opt[];
  customers: Opt[];
  projects: Opt[];
  thresholdFor: (id: string) => number;
  dayLabel: string;
  weather: { day: WeatherDay; placeLabel: string } | null;
  route: DayRoute | null;
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
          <Link href={schedHref({ view: "day", date: prevKey, worker, status: statusFilter })}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="text-sm font-medium capitalize text-neutral-900 dark:text-neutral-100">
            {dayLabel}
          </span>
          {!isToday && (
            <Button asChild variant="ghost" size="sm">
              <Link href={schedHref({ view: "day", worker, status: statusFilter })}>{t.today}</Link>
            </Button>
          )}
        </div>
        <Button asChild variant="outline" size="icon" aria-label={t.nextDay}>
          <Link href={schedHref({ view: "day", date: nextKey, worker, status: statusFilter })}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* A compact day-meta row: weather stays glanceable inline; the driving
          route tucks into a bottom sheet so it doesn't stack down the page. */}
      {(weather || route) && (
        <div className="flex flex-wrap items-stretch gap-2">
          {weather && (
            <div className="min-w-[14rem] flex-1">
              <ScheduleDayWeather day={weather.day} placeLabel={weather.placeLabel} />
            </div>
          )}
          {route && (
            <SheetButton
              label={`${t.routeTitle} · ${route.stops.length}`}
              icon={<Route className="h-4 w-4" />}
              title={t.routeTitle}
            >
              <div className="flex flex-col gap-3">
                <Button asChild variant="outline" className="w-full">
                  <a href={route.mapsUrl} target="_blank" rel="noopener noreferrer">
                    <Navigation className="h-4 w-4" />
                    {t.routeOpen}
                  </a>
                </Button>
                <ol className="flex flex-col gap-2.5">
                  {route.stops.map((s, i) => (
                    <li key={s.id} className="flex items-center gap-2.5 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900 tabular-nums">
                        {i + 1}
                      </span>
                      <span className="min-w-0 truncate text-neutral-900 dark:text-neutral-100">
                        {s.title}
                        <span className="text-neutral-500 dark:text-neutral-400"> · {s.place}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </SheetButton>
          )}
        </div>
      )}

      <ScheduleDayTimeline
        jobs={dayJobs}
        conflictIds={conflictIds}
        conflictLabel={t.conflictBadge}
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
        heading={isToday ? `${t.today} · ${dayLabel}` : dayLabel}
        jobs={dayJobs}
        conflictIds={conflictIds}
        emptyCtaHref={schedHref({ view: "day", date: selectedKey, worker, status: statusFilter, create: true })}
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
  statusFilter,
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
  statusFilter?: ScheduledJobStatus;
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
          <Link href={schedHref({ view: "team", date: prevKey, worker, status: statusFilter })}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {t.weekOf.replace("{date}", weekOfFmt.format(from))}
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href={schedHref({ view: "team", worker, status: statusFilter })}>{t.today}</Link>
          </Button>
        </div>
        <Button asChild variant="outline" size="icon" aria-label={t.nextWeek}>
          <Link href={schedHref({ view: "team", date: nextKey, worker, status: statusFilter })}>
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
                      href={schedHref({ view: "day", date: k, worker: row.id ?? undefined, status: statusFilter })}
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
  statusFilter,
  workers,
  teams,
  customers,
  projects,
  dayFmt,
  weekOfFmt,
  t,
}: {
  from: Date;
  todayKey: string;
  byDay: Map<string, ScheduleJobView[]>;
  worker?: string;
  statusFilter?: ScheduledJobStatus;
  workers: Opt[];
  teams: Opt[];
  customers: Opt[];
  projects: Opt[];
  dayFmt: Intl.DateTimeFormat;
  weekOfFmt: Intl.DateTimeFormat;
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
          <Link href={schedHref({ view: "week", date: prevKey, worker, status: statusFilter })}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {t.weekOf.replace("{date}", weekOfFmt.format(from))}
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href={schedHref({ view: "week", worker, status: statusFilter })}>{t.today}</Link>
          </Button>
        </div>
        <Button asChild variant="outline" size="icon" aria-label={t.nextWeek}>
          <Link href={schedHref({ view: "week", date: nextKey, worker, status: statusFilter })}>
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
        <>
          <p className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
            <GripVertical className="h-3.5 w-3.5" />
            {t.dragToReschedule}
          </p>
          <WeekBoard
            days={days.map((d) => {
              const key = dayKey(d);
              return {
                key,
                label: dayFmt.format(d),
                isToday: key === todayKey,
                createHref: schedHref({ view: "week", date: key, worker, status: statusFilter, create: true }),
                dayHref: schedHref({ view: "day", date: key, worker, status: statusFilter }),
              };
            })}
            initialJobsByDay={Object.fromEntries(
              days.map((d) => {
                const key = dayKey(d);
                return [key, byDay.get(key) ?? []];
              })
            )}
            workers={workers}
            teams={teams}
            customers={customers}
            projects={projects}
            conflictIds={[...conflictIds]}
          />
        </>
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
  hideHeading = false,
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
  // Drop the heading row when the section lives inside the day sheet (the sheet
  // header already shows the date).
  hideHeading?: boolean;
}) {
  return (
    <section className="flex flex-col gap-2">
      {!hideHeading && (
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold capitalize text-neutral-900 dark:text-neutral-100">{heading}</h2>
          {jobs.length > 0 && (
            <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">{count(jobs.length)}</span>
          )}
        </div>
      )}
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
