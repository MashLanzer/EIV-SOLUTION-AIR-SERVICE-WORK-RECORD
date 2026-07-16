"use client";

import type { ScheduledJobStatus } from "@prisma/client";
import { CalendarClock, CheckCircle2, CircleDot, PlayCircle, Truck, XCircle } from "lucide-react";

import { useT } from "@/components/i18n/LocaleProvider";

export type TimelineEvent = {
  status: ScheduledJobStatus;
  actorName: string;
  // Pre-formatted by the caller (server or client) so this component stays
  // locale-agnostic.
  time: string;
};

const ICONS: Record<ScheduledJobStatus, typeof Truck> = {
  SCHEDULED: CalendarClock,
  STARTED: CircleDot,
  EN_ROUTE: Truck,
  IN_PROGRESS: PlayCircle,
  DONE: CheckCircle2,
  CANCELED: XCircle,
};

// A compact vertical trail of a job's status changes. Used both in the office
// (admin job card) and on the customer portal, so everyone sees the same
// "scheduled → on the way → working → done" story with who moved it and when.
export function JobStatusTimeline({ events }: { events: TimelineEvent[] }) {
  const t = useT().schedule;
  const label: Record<ScheduledJobStatus, string> = {
    SCHEDULED: t.statusScheduled,
    STARTED: t.statusStarted,
    EN_ROUTE: t.statusEnRoute,
    IN_PROGRESS: t.statusInProgress,
    DONE: t.statusDone,
    CANCELED: t.statusCanceled,
  };

  if (events.length === 0) return null;

  return (
    <ol className="flex flex-col gap-3">
      {events.map((e, i) => {
        const Icon = ICONS[e.status];
        const isLast = i === events.length - 1;
        return (
          <li key={i} className="relative flex gap-3">
            {!isLast && (
              <span
                className="absolute left-[11px] top-6 h-[calc(100%+0.25rem)] w-px bg-neutral-200 dark:bg-neutral-700"
                aria-hidden
              />
            )}
            <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {label[e.status]}
                </span>
                <span className="text-xs tabular-nums text-neutral-400">{e.time}</span>
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{e.actorName}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
