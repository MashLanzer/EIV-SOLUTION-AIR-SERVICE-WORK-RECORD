import { CalendarDays } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkerJobCard, type WorkerJobView } from "@/components/schedule/WorkerJobCard";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { getT, getLocale } from "@/lib/i18n/server";
import { addUtcDays, dayKey, getScheduledJobs, startOfUtcDay } from "@/lib/schedule";

// How far ahead the worker's upcoming view looks.
const HORIZON_DAYS = 21;

export default async function WorkerSchedulePage() {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const t = (await getT()).schedule;
  const locale = await getLocale();
  const intlLocale = locale === "es" ? "es-ES" : "en-US";

  const today = startOfUtcDay(new Date());
  const from = today;
  const to = addUtcDays(today, HORIZON_DAYS);
  const todayKey = dayKey(today);

  const jobs = await getScheduledJobs({ session, organizationId, from, to });

  // Canceled visits are hidden from the worker's forward view - they're not
  // something to act on.
  type Row = WorkerJobView & { day: string };
  const views: Row[] = jobs
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
  const dayOrder: string[] = [];
  for (const v of views) {
    if (!byDay.has(v.day)) {
      byDay.set(v.day, []);
      dayOrder.push(v.day);
    }
    byDay.get(v.day)!.push(v);
  }

  const dayFmt = new Intl.DateTimeFormat(intlLocale, {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

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

      {dayOrder.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={CalendarDays}
              title={t.noUpcoming}
              description={t.noUpcomingDesc}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {dayOrder.map((key) => {
            const isToday = key === todayKey;
            const label = isToday
              ? t.today
              : dayFmt.format(new Date(`${key}T00:00:00.000Z`));
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
                    {label}
                  </h2>
                </div>
                <div className="flex flex-col gap-2">
                  {(byDay.get(key) ?? []).map((job) => (
                    <WorkerJobCard key={job.id} job={job} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
