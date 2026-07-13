import { CalendarDays, CalendarPlus, ChevronDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
} from "@/lib/schedule";

function parseDateParam(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return startOfUtcDay(new Date());
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const t = (await getT()).schedule;
  const locale = await getLocale();
  const intlLocale = locale === "es" ? "es-ES" : "en-US";

  const { date } = await searchParams;
  const selected = parseDateParam(date);
  const selectedKey = dayKey(selected);
  const todayKey = dayKey(startOfUtcDay(new Date()));

  // The 6-week grid that renders the selected day's month; fetch every job in
  // it so the calendar can show per-day activity, and the selected day its
  // full cards.
  const gridDays = monthGridDays(selected);
  const from = gridDays[0];
  const to = addUtcDays(gridDays[gridDays.length - 1], 1);

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

  // Calendar cells: day number, whether it's in the selected month, activity
  // count and up to three team-color dots.
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

  // The selected day's jobs, in the same order the calendar counts them.
  const selectedJobs = byDay.get(selectedKey) ?? [];

  // Overlap flags for the selected day (same worker, overlapping timed window).
  const conflictIds = new Set<string>();
  const byWorker = new Map<string, ScheduleJobView[]>();
  for (const v of selectedJobs) {
    if (!v.assignedToId || v.status === "CANCELED") continue;
    const list = byWorker.get(v.assignedToId) ?? [];
    list.push(v);
    byWorker.set(v.assignedToId, list);
  }
  for (const list of byWorker.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (
          timeWindowsOverlap(list[i].startTime, list[i].endTime, list[j].startTime, list[j].endTime)
        ) {
          conflictIds.add(list[i].id);
          conflictIds.add(list[j].id);
        }
      }
    }
  }

  // Month nav targets: the 1st of the previous / next month (and today).
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

  // Localized Monday-first weekday initials, built from a known Monday.
  const weekdayFmt = new Intl.DateTimeFormat(intlLocale, {
    weekday: "short",
    timeZone: "UTC",
  });
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    weekdayFmt.format(utcDay(2024, 0, 1 + i))
  ); // 2024-01-01 is a Monday

  const count = (n: number) =>
    (n === 1 ? t.jobCountOne : t.jobCountMany).replace("{n}", String(n));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
          <CalendarDays className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {t.title}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.subtitle}</p>
        </div>
      </div>

      <ScheduleMonthCalendar
        monthLabel={monthLabel}
        weekdayLabels={weekdayLabels}
        days={calendarDays}
        basePath="/admin/schedule"
        prevHref={`/admin/schedule?date=${prevMonthKey}`}
        nextHref={`/admin/schedule?date=${nextMonthKey}`}
        todayHref="/admin/schedule"
        prevLabel={t.prevMonth}
        nextLabel={t.nextMonth}
        todayLabel={t.today}
      />

      {/* New job (collapsed by default; opens on tap, defaults to the day) */}
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
              defaultDate={selectedKey}
              workers={workers}
              teams={teams}
              customers={customers}
              projects={projects}
            />
          </div>
        </details>
      </Card>

      {/* Selected day */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold capitalize text-neutral-900 dark:text-neutral-100">
            {selectedKey === todayKey ? `${t.today} · ${selectedDayLabel}` : selectedDayLabel}
          </h2>
          {selectedJobs.length > 0 && (
            <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
              {count(selectedJobs.length)}
            </span>
          )}
        </div>
        {selectedJobs.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={CalendarDays}
                title={t.noJobsDay}
                description={t.noJobsWeekDesc}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedJobs.map((job) => (
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
    </div>
  );
}
