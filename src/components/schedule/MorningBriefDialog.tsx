"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Clock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/LocaleProvider";
import { useUse24Hour } from "@/components/i18n/TimeFormatProvider";
import { formatTime } from "@/lib/format";

export interface BriefJob {
  id: string;
  title: string;
  startTime: string | null;
  customerName: string | null;
  projectName: string | null;
}

// The morning brief: a once-a-day dialog that greets the worker with today's
// scheduled visits when they open the app. It's a gentle nudge, not push - it
// only shows if there are jobs today, and only once per day per device (a
// localStorage stamp of today's date, keyed per user).
export function MorningBriefDialog({
  jobs,
  dayKey,
  userId,
}: {
  jobs: BriefJob[];
  dayKey: string;
  userId: string;
}) {
  const t = useT().schedule;
  const tc = useT().common;
  const use24 = useUse24Hour();
  const [open, setOpen] = useState(false);
  const storageKey = `aerotrack:morningBrief:${userId}`;

  // Deciding whether to show can only happen on the client (it reads
  // localStorage), so it necessarily lives in an effect after mount.
  useEffect(() => {
    if (jobs.length === 0) return;
    try {
      if (localStorage.getItem(storageKey) === dayKey) return;
    } catch {
      // Private mode / storage disabled: fall through and just show it.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [jobs.length, dayKey, storageKey]);

  function dismiss() {
    try {
      localStorage.setItem(storageKey, dayKey);
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!open) return null;

  const subtitle = (
    jobs.length === 1 ? t.morningSubtitleOne : t.morningSubtitleMany
  ).replace("{n}", String(jobs.length));

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={dismiss}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-fade-up rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-text">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
                {t.morningTitle}
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={tc.close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="mt-4 flex max-h-72 flex-col divide-y divide-neutral-100 dark:divide-neutral-800 overflow-y-auto">
          {jobs.map((j) => (
            <li key={j.id} className="flex items-center gap-3 py-2.5">
              <span className="flex w-16 shrink-0 items-center gap-1 text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
                <Clock className="h-3.5 w-3.5" />
                {j.startTime ? formatTime(j.startTime, use24) : t.allDay}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {j.title || t.untitled}
                </p>
                {(j.customerName || j.projectName) && (
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {[j.customerName, j.projectName].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex gap-2">
          <Button asChild className="flex-1" onClick={dismiss}>
            <Link href="/records/schedule">{t.morningViewSchedule}</Link>
          </Button>
          <Button type="button" variant="outline" onClick={dismiss}>
            {t.morningDismiss}
          </Button>
        </div>
      </div>
    </div>
  );
}
