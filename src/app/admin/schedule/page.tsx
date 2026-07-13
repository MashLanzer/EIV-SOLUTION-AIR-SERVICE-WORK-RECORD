import Link from "next/link";
import { CalendarDays, CalendarPlus, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ScheduleJobCard, type ScheduleJobView } from "@/components/schedule/ScheduleJobCard";
import { ScheduleJobForm } from "@/components/schedule/ScheduleJobForm";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { getT, getLocale } from "@/lib/i18n/server";
import {
  addUtcDays,
  dayKey,
  getScheduledJobs,
  startOfUtcDay,
  timeWindowsOverlap,
  weekRange,
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
  const anchor = parseDateParam(date);
  const { from, to } = weekRange(anchor);
  const todayKey = dayKey(startOfUtcDay(new Date()));

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

  // Flag jobs where the same worker is double-booked with an overlapping timed
  // window on the same day, so the calendar warns at a glance (not just on save).
  const conflictIds = new Set<string>();
  const byDayWorker = new Map<string, ScheduleJobView[]>();
  for (const v of views) {
    if (!v.assignedToId || v.status === "CANCELED") continue;
    const k = `${v.scheduledFor}|${v.assignedToId}`;
    const list = byDayWorker.get(k) ?? [];
    list.push(v);
    byDayWorker.set(k, list);
  }
  for (const list of byDayWorker.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (
          timeWindowsOverlap(
            list[i].startTime,
            list[i].endTime,
            list[j].startTime,
            list[j].endTime
          )
        ) {
          conflictIds.add(list[i].id);
          conflictIds.add(list[j].id);
        }
      }
    }
  }

  const days = Array.from({ length: 7 }, (_, i) => addUtcDays(from, i));
  const prevWeekKey = dayKey(addUtcDays(from, -7));
  const nextWeekKey = dayKey(addUtcDays(from, 7));
  // Land a new job on the day being viewed (today if it's in this week).
  const formDefaultDate =
    todayKey >= dayKey(from) && todayKey < dayKey(to) ? todayKey : dayKey(from);

  const dayFmt = new Intl.DateTimeFormat(intlLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const weekFmt = new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

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

      {/* Week navigator */}
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="outline" size="icon" aria-label={t.prevWeek}>
          <Link href={`/admin/schedule?date=${prevWeekKey}`}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center justify-center gap-2 text-center">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {t.weekOf.replace("{date}", weekFmt.format(from))}
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/schedule">{t.today}</Link>
          </Button>
        </div>
        <Button asChild variant="outline" size="icon" aria-label={t.nextWeek}>
          <Link href={`/admin/schedule?date=${nextWeekKey}`}>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* New job */}
      <Card>
        <details className="group" open={views.length === 0}>
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

      {views.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={CalendarDays}
              title={t.noJobsWeek}
              description={t.noJobsWeekDesc}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((day) => {
            const key = dayKey(day);
            const dayJobs = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            return (
              <section key={key} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <h2
                    className={
                      "text-xs font-semibold uppercase tracking-wide " +
                      (isToday
                        ? "text-primary"
                        : "text-neutral-500 dark:text-neutral-400")
                    }
                  >
                    {dayFmt.format(day)}
                  </h2>
                  {isToday && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-text">
                      {t.today}
                    </span>
                  )}
                  {dayJobs.length > 0 && (
                    <span className="text-xs tabular-nums text-neutral-400 dark:text-neutral-500">
                      {count(dayJobs.length)}
                    </span>
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
          })}
        </div>
      )}
    </div>
  );
}
