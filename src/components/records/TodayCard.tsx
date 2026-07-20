import Link from "next/link";
import { ArrowRight, CalendarClock, ChevronRight } from "lucide-react";
import type { ScheduledJobStatus } from "@prisma/client";

import { Card, CardContent } from "@/components/ui/card";
import { ScheduleStatusBadge } from "@/components/schedule/ScheduleStatusBadge";
import { formatTimeRange } from "@/lib/format";
import { getT } from "@/lib/i18n/server";

export interface TodayJob {
  id: string;
  startTime: string | null;
  endTime: string | null;
  title: string;
  customerName: string | null;
  status: ScheduledJobStatus;
  workRecordId: string | null;
}

const MAX_SHOWN = 4;

// A compact "what's on today" card for the worker home. The morning brief is a
// once-a-day dialog; this stays put so the crew always lands on today's visits.
// Each row jumps straight to the useful next step — open the record if one
// exists, else start it from the job.
export async function TodayCard({
  jobs,
  use24,
}: {
  jobs: TodayJob[];
  use24: boolean;
}) {
  if (jobs.length === 0) return null;
  const ts = (await getT()).schedule;

  const shown = jobs.slice(0, MAX_SHOWN);
  const extra = jobs.length - shown.length;
  const allDone = jobs.every((j) => j.status === "DONE");

  return (
    <Card className="animate-fade-up border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40">
      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            {ts.todayTitle}
            <span className="tabular-nums text-neutral-400 dark:text-neutral-500">
              · {jobs.length}
            </span>
          </span>
          <Link
            href="/records/schedule"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:opacity-80"
          >
            {ts.todayOpenSchedule}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <ul className="flex flex-col divide-y divide-neutral-200/70 dark:divide-neutral-800">
          {shown.map((j) => {
            const href = j.workRecordId
              ? `/records/${j.workRecordId}`
              : `/records/new?jobId=${j.id}`;
            const actionLabel = j.workRecordId ? ts.todayView : ts.todayStart;
            return (
              <li key={j.id}>
                <Link
                  href={href}
                  className="-mx-1 flex items-center gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-white/70 dark:hover:bg-neutral-800/50"
                >
                  <span className="w-16 shrink-0 text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
                    {formatTimeRange(j.startTime, null, use24, ts.allDay)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {j.title || j.customerName || ts.untitled}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <ScheduleStatusBadge status={j.status} />
                      {j.customerName && j.title && (
                        <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                          {j.customerName}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary">
                    {actionLabel}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {extra > 0 && (
          <Link
            href="/records/schedule"
            className="text-xs font-medium text-neutral-500 hover:text-primary dark:text-neutral-400"
          >
            {ts.todayMore.replace("{n}", String(extra))}
          </Link>
        )}
        {allDone && (
          <p className="text-xs text-success-text">{ts.todayAllDone}</p>
        )}
      </CardContent>
    </Card>
  );
}
