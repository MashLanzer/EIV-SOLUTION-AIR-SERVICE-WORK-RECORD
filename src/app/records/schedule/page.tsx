import { CalendarDays } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkerJobCard, type WorkerJobView } from "@/components/schedule/WorkerJobCard";
import {
  ScheduleMonthCalendar,
  type CalendarDay,
} from "@/components/schedule/ScheduleMonthCalendar";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { getT, getLocale } from "@/lib/i18n/server";
import {
  addUtcDays,
  dayKey,
  getScheduledJobs,
  monthGridDays,
  startOfUtcDay,
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

  const gridDays = monthGridDays(selected);
  const from = gridDays[0];
  const to = addUtcDays(gridDays[gridDays.length - 1], 1);

  const jobs = await getScheduledJobs({ session, organizationId, from, to });

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
      projectId: j.projectId,
      projectName: j.project?.name ?? null,
      projectAddress: j.project?.address ?? null,
      workRecordId: j.workRecordId,
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
    return {
      key,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === selectedMonth,
      isToday: key === todayKey,
      isSelected: key === selectedKey,
      count: (byDay.get(key) ?? []).length,
    };
  });

  const selectedJobs = byDay.get(selectedKey) ?? [];

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
    weekdayFmt.format(utcDay(2024, 0, 1 + i))
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {t.title}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t.workerSubtitle}
        </p>
      </div>

      <ScheduleMonthCalendar
        monthLabel={monthLabel}
        weekdayLabels={weekdayLabels}
        days={calendarDays}
        basePath="/records/schedule"
        prevHref={`/records/schedule?date=${prevMonthKey}`}
        nextHref={`/records/schedule?date=${nextMonthKey}`}
        todayHref="/records/schedule"
        prevLabel={t.prevMonth}
        nextLabel={t.nextMonth}
        todayLabel={t.today}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold capitalize text-neutral-900 dark:text-neutral-100">
          {selectedKey === todayKey ? `${t.today} · ${selectedDayLabel}` : selectedDayLabel}
        </h2>
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
              <WorkerJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
