"use client";

import { useMemo } from "react";
import type { ScheduledJobStatus } from "@prisma/client";
import { CalendarClock, CheckCircle2, CircleDot, PlayCircle, Truck, XCircle } from "lucide-react";

import { useLocale, useT } from "@/components/i18n/LocaleProvider";

export type TimelineEvent = {
  status: ScheduledJobStatus;
  actorName: string;
  // The absolute instant of the status change, as epoch milliseconds. Formatting
  // is deliberately done here in the client so each timestamp renders in the
  // viewer's *device* time zone — the real local time on the phone — instead of
  // the server's zone (UTC), which was showing every event hours off.
  at: number;
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
  const locale = useLocale();
  // No `timeZone` option → Intl uses the browser's own zone, i.e. the real
  // wall-clock time on the device viewing (and, in practice, the one that
  // uploaded) the event.
  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    [locale]
  );
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
                {/* suppressHydrationWarning: the server pre-renders this in UTC
                    but the client re-formats it in the device zone; the text
                    differing between the two is expected, not a bug. */}
                <span
                  className="text-xs tabular-nums text-neutral-400"
                  suppressHydrationWarning
                >
                  {timeFmt.format(e.at)}
                </span>
              </div>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{e.actorName}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
