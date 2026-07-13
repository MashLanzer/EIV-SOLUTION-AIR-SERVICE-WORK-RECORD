import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CalendarDay {
  key: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  count: number;
  // Up to a few dot colors (team colors, "" = default) hinting how busy the day
  // is at a glance.
  colors: string[];
}

// A month grid: seven weekday columns, six week rows. Each day links to
// ?date=<key> so selecting it re-renders the page with that day's jobs below.
// Purely presentational (server-rendered links) - all labels come in as props
// so it needs no client JS.
export function ScheduleMonthCalendar({
  monthLabel,
  weekdayLabels,
  days,
  basePath,
  prevHref,
  nextHref,
  todayHref,
  prevLabel,
  nextLabel,
  todayLabel,
}: {
  monthLabel: string;
  weekdayLabels: string[];
  days: CalendarDay[];
  basePath: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  prevLabel: string;
  nextLabel: string;
  todayLabel: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
      {/* Month nav */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <Link
          href={prevHref}
          aria-label={prevLabel}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold capitalize text-neutral-900 dark:text-neutral-100">
            {monthLabel}
          </span>
          <Link
            href={todayHref}
            className="rounded-md px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {todayLabel}
          </Link>
        </div>
        <Link
          href={nextHref}
          aria-label={nextLabel}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1">
        {weekdayLabels.map((w, i) => (
          <div
            key={i}
            className="pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <Link
            key={d.key}
            href={`${basePath}?date=${d.key}`}
            aria-current={d.isSelected ? "date" : undefined}
            className={cn(
              "flex min-h-[2.75rem] flex-col items-center justify-start gap-1 rounded-lg py-1.5 text-sm tabular-nums transition-colors",
              d.isSelected
                ? "bg-primary font-semibold text-primary-foreground"
                : d.inMonth
                  ? "text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  : "text-neutral-300 hover:bg-neutral-100 dark:text-neutral-600 dark:hover:bg-neutral-800",
              !d.isSelected && d.isToday && "ring-1 ring-inset ring-primary text-primary"
            )}
          >
            <span>{d.day}</span>
            {d.count > 0 && (
              <span className="flex h-1.5 items-center gap-0.5">
                {d.colors.slice(0, 3).map((c, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      d.isSelected
                        ? "bg-primary-foreground"
                        : c
                          ? ""
                          : "bg-primary"
                    )}
                    style={!d.isSelected && c ? { backgroundColor: c } : undefined}
                  />
                ))}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
