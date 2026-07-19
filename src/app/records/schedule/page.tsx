import Link from "next/link";
import {
  ArrowRight,
  CalendarArrowDown,
  CalendarClock,
  CalendarDays,
  Clock,
  MapPin,
  Navigation,
  Route,
  Search,
  TriangleAlert,
} from "lucide-react";
import type { ScheduledJobStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { formatTimeRange } from "@/lib/format";
import { WorkerJobCard, type WorkerJobView } from "@/components/schedule/WorkerJobCard";
import { ScheduleDayTimeline } from "@/components/schedule/ScheduleDayTimeline";
import { SheetButton } from "@/components/schedule/SheetButton";
import { DaySheet } from "@/components/schedule/DaySheet";
import { ProjectsMapCard } from "@/components/projects/ProjectsMapCard";
import type { MapPin as MapPinData } from "@/components/projects/ProjectsMap";
import { ScheduleDayWeather } from "@/components/schedule/ScheduleDayWeather";
import { orderByRoute } from "@/lib/route";
import { getWeather, type WeatherDay } from "@/lib/weather";
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

// Lifecycle statuses a worker can filter their calendar by (canceled visits are
// hidden from workers entirely, so it's not a chip).
const WORKER_JOB_STATUSES: ScheduledJobStatus[] = [
  "SCHEDULED",
  "STARTED",
  "EN_ROUTE",
  "IN_PROGRESS",
  "DONE",
];

// A /records/schedule URL that carries the date + status + search so day taps,
// month nav and the chips never drop the active filter.
function schedHref(params: { date?: string; status?: string; q?: string; day?: boolean }): string {
  const p = new URLSearchParams();
  if (params.date) p.set("date", params.date);
  if (params.status) p.set("status", params.status);
  if (params.q) p.set("q", params.q);
  if (params.day) p.set("day", "1");
  const qs = p.toString();
  return qs ? `/records/schedule?${qs}` : "/records/schedule";
}

type DayRoute = {
  stops: { id: string; title: string; place: string; lat: number; lng: number }[];
  mapsUrl: string;
};

// Best-effort weather for the selected day: the first geocoded jobsite that day
// with a forecast for that date. Returns null when nothing's located or the day
// falls outside the short forecast window. Mirrors the admin day view.
async function getWorkerDayWeather(
  organizationId: string,
  dayJobs: { status: string; projectId: string | null }[],
  dayIso: string
): Promise<{ day: WeatherDay; placeLabel: string } | null> {
  const projectIds = [
    ...new Set(
      dayJobs
        .filter((j) => j.status !== "CANCELED")
        .map((j) => j.projectId)
        .filter((id): id is string => !!id)
    ),
  ];
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

// The selected day's geocoded jobsites, resolved once: map pins for every located
// job and a suggested driving route (nearest-neighbour + a Google Maps link)
// once there are two or more. Mirrors the admin day view; scoped to the worker's
// own jobs (they already see these visits). Both empty/null when nothing's
// geocoded.
async function getWorkerDayGeo(
  organizationId: string,
  dayJobs: { id: string; title: string; status: string; projectId: string | null }[]
): Promise<{ pins: MapPinData[]; route: DayRoute | null }> {
  const empty = { pins: [] as MapPinData[], route: null };
  const withProject = dayJobs.filter((j) => j.status !== "CANCELED" && j.projectId);
  const projectIds = [...new Set(withProject.map((j) => j.projectId as string))];
  if (projectIds.length === 0) return empty;

  const projects = await prisma.project.findMany({
    where: { organizationId, id: { in: projectIds }, latitude: { not: null }, longitude: { not: null } },
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
  if (points.length === 0) return empty;

  const pins: MapPinData[] = points.map((pt) => ({
    id: pt.id,
    name: pt.title || pt.place,
    latitude: pt.lat,
    longitude: pt.lng,
    subtitle: pt.place,
  }));

  if (points.length < 2) return { pins, route: null };

  const stops = orderByRoute(points);
  const mapsUrl = `https://www.google.com/maps/dir/${stops.map((s) => `${s.lat},${s.lng}`).join("/")}`;
  return { pins, route: { stops, mapsUrl } };
}

export default async function WorkerSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string; q?: string }>;
}) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const t = (await getT()).schedule;
  const locale = await getLocale();
  const intlLocale = locale === "es" ? "es-ES" : "en-US";

  const { date, status: statusParam, q: qParam } = await searchParams;
  const statusFilter = WORKER_JOB_STATUSES.includes(statusParam as ScheduledJobStatus)
    ? (statusParam as ScheduledJobStatus)
    : undefined;
  const query = qParam?.trim() || undefined;
  const queryLc = query?.toLowerCase();
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

  // Apply the status chip + search once, so the month counts, the day sheet and
  // the KPIs all work off the same filtered set.
  const shownRows = rows.filter(
    (r) =>
      (!statusFilter || r.status === statusFilter) &&
      (!queryLc ||
        `${r.title ?? ""} ${r.customerName ?? ""} ${r.projectName ?? ""}`
          .toLowerCase()
          .includes(queryLc))
  );

  const byDay = new Map<string, Row[]>();
  for (const r of shownRows) {
    const list = byDay.get(r.day) ?? [];
    list.push(r);
    byDay.set(r.day, list);
  }

  const selectedMonth = selected.getUTCMonth();
  // Month KPIs (from the filtered set, days that belong to the selected month):
  // total visits, how many are done, and how many are still ahead.
  const monthShown = gridDays
    .filter((d) => d.getUTCMonth() === selectedMonth)
    .flatMap((d) => byDay.get(dayKey(d)) ?? []);
  const kpiTotal = monthShown.length;
  const kpiDone = monthShown.filter((j) => j.status === "DONE").length;
  const kpiDonePct = kpiTotal > 0 ? Math.round((kpiDone / kpiTotal) * 100) : 0;
  const kpiUpcoming = kpiTotal - kpiDone;

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
  // The day's map pins + suggested driving route, tucked into sheets so they add
  // no vertical height. Fetched only when the day has jobs to geocode.
  const dayGeo =
    selectedJobs.length > 0
      ? await getWorkerDayGeo(organizationId, selectedJobs)
      : { pins: [] as MapPinData[], route: null };
  // Best-effort weather for the selected day at its first geocoded jobsite.
  const dayWeather =
    selectedJobs.length > 0
      ? await getWorkerDayWeather(organizationId, selectedJobs, selectedKey)
      : null;

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

      {/* Search my visits (title / customer / project), preserving the status
          filter and the viewed month. */}
      <form method="get" className="relative">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <input type="hidden" name="date" value={selectedKey} />
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
        <Input
          type="search"
          name="q"
          placeholder={t.searchVisits}
          defaultValue={query}
          className="pl-9"
          aria-label={t.searchVisitsAria}
        />
      </form>

      {/* Status filter chips — narrow the calendar + day sheet to one status. */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(
          [
            { value: undefined, label: t.filterAll },
            ...WORKER_JOB_STATUSES.map((s) => ({
              value: s,
              label:
                s === "SCHEDULED"
                  ? t.statusScheduled
                  : s === "STARTED"
                    ? t.statusStarted
                    : s === "EN_ROUTE"
                      ? t.statusEnRoute
                      : s === "IN_PROGRESS"
                        ? t.statusInProgress
                        : t.statusDone,
            })),
          ] as { value?: ScheduledJobStatus; label: string }[]
        ).map((chip) => (
          <FilterChip
            key={chip.value ?? "all"}
            href={schedHref({ date: selectedKey, status: chip.value, q: query })}
            active={statusFilter === chip.value}
          >
            {chip.label}
          </FilterChip>
        ))}
      </div>

      {/* Month KPIs — this month's visits, completion, and how many are ahead. */}
      <div className="grid animate-fade-up grid-cols-3 gap-3 sm:gap-4">
        <StatTile center label={t.summaryJobs} value={String(kpiTotal)} />
        <StatTile
          center
          label={t.summaryCompleted}
          value={`${kpiDonePct}%`}
          sub={`${kpiDone}/${kpiTotal}`}
        />
        <StatTile center label={t.summaryUpcoming} value={String(kpiUpcoming)} />
      </div>

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
        dayHref={(key) => schedHref({ date: key, status: statusFilter, q: query, day: true })}
        prevHref={schedHref({ date: prevMonthKey, status: statusFilter, q: query })}
        nextHref={schedHref({ date: nextMonthKey, status: statusFilter, q: query })}
        todayHref={schedHref({ status: statusFilter, q: query })}
        prevLabel={t.prevMonth}
        nextLabel={t.nextMonth}
        todayLabel={t.today}
      />

      {/* Tapping a day opens its jobs in a bottom sheet (over the calendar) so
          the page stays compact. Open state rides on ?day=1. */}
      <DaySheet
        title={selectedKey === todayKey ? `${t.today} · ${selectedDayLabel}` : selectedDayLabel}
      >
        <div className="flex flex-col gap-3">
          {selectedJobs.length > 0 && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {t.dayProgress
                  .replace("{done}", String(doneCount))
                  .replace("{total}", String(selectedJobs.length))}
              </span>
            </div>
          )}

          {dayWeather && (
            <ScheduleDayWeather day={dayWeather.day} placeLabel={dayWeather.placeLabel} />
          )}

          {selectedJobs.length >= overloadThreshold && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/70 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3.5 py-2.5 text-amber-800 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm">
                {t.overloadWarningYou.replace("{n}", String(selectedJobs.length))}
              </p>
            </div>
          )}

          {/* Secondary day info — timeline, map and driving route — as inner
              sheets so the day sheet leads with the actual job cards. */}
          {(hasTimeline || dayGeo.pins.length > 0 || dayGeo.route) && (
            <div className="flex flex-wrap items-stretch gap-2">
              {dayGeo.pins.length > 0 && (
                <SheetButton
                  label={`${t.mapTitle} · ${dayGeo.pins.length}`}
                  icon={<MapPin className="h-4 w-4" />}
                  title={t.mapTitle}
                >
                  <ProjectsMapCard pins={dayGeo.pins} />
                </SheetButton>
              )}
              {hasTimeline && (
                <SheetButton label={t.timeline} icon={<Clock className="h-4 w-4" />} title={t.timeline}>
                  <ScheduleDayTimeline
                    jobs={selectedJobs}
                    conflictIds={conflictIds}
                    conflictLabel={t.conflictBadge}
                    use24={use24}
                  />
                </SheetButton>
              )}
              {dayGeo.route && (
                <SheetButton
                  label={`${t.routeTitle} · ${dayGeo.route.stops.length}`}
                  icon={<Route className="h-4 w-4" />}
                  title={t.routeTitle}
                >
                  <div className="flex flex-col gap-3">
                    <Button asChild variant="outline" className="w-full">
                      <a href={dayGeo.route.mapsUrl} target="_blank" rel="noopener noreferrer">
                        <Navigation className="h-4 w-4" />
                        {t.routeOpen}
                      </a>
                    </Button>
                    <ol className="flex flex-col gap-2.5">
                      {dayGeo.route.stops.map((s, i) => (
                        <li key={s.id} className="flex items-center gap-2.5 text-sm">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold tabular-nums text-white dark:bg-neutral-100 dark:text-neutral-900">
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

          {selectedJobs.length === 0 ? (
            <EmptyState icon={CalendarDays} title={t.noJobsDay} description={t.noUpcomingDesc} />
          ) : (
            <div className="flex flex-col gap-2">
              {selectedJobs.map((job) => (
                <div key={job.id} id={`job-${job.id}`} className="scroll-mt-20">
                  <WorkerJobCard job={job} />
                </div>
              ))}
            </div>
          )}
        </div>
      </DaySheet>
    </div>
  );
}
