import Link from "next/link";
import { CalendarClock, ChevronRight, Clock, User as UserIcon } from "lucide-react";
import type { ScheduledJobStatus } from "@prisma/client";

import { Card, CardContent } from "@/components/ui/card";
import { ScheduleStatusBadge } from "@/components/schedule/ScheduleStatusBadge";

export interface ProjectScheduleJob {
  id: string;
  title: string;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  who: string | null;
  status: ScheduledJobStatus;
}

// Upcoming scheduled visits for a project, shown on the project detail page so
// the calendar is tied into the rest of the app instead of living on its own.
// Each row opens that day on the schedule.
export function ProjectSchedule({
  jobs,
  title,
  emptyText,
  viewAllLabel,
}: {
  jobs: ProjectScheduleJob[];
  title: string;
  emptyText: string;
  viewAllLabel: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            <CalendarClock className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            {title}
          </span>
          <Link
            href="/admin/schedule"
            className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {viewAllLabel}
          </Link>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{emptyText}</p>
        ) : (
          <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/admin/schedule?view=day&date=${job.dateKey}`}
                className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                      {job.title}
                    </span>
                    <ScheduleStatusBadge status={job.status} />
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      {job.dateLabel} · {job.timeLabel}
                    </span>
                    {job.who && (
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-3 w-3 shrink-0" />
                        {job.who}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-500 dark:text-neutral-600 dark:group-hover:text-neutral-400" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
