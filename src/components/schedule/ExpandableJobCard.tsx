"use client";

import { useState } from "react";
import { ChevronDown, Clock } from "lucide-react";

import {
  ScheduleJobCard,
  type ScheduleJobView,
} from "@/components/schedule/ScheduleJobCard";
import { ScheduleStatusBadge } from "@/components/schedule/ScheduleStatusBadge";
import type { JobOption } from "@/components/schedule/ScheduleJobForm";
import { useT } from "@/components/i18n/LocaleProvider";

// A day's job shown as a compact row (time · title · who · status) that expands
// on tap into the full editable card. Keeps the day view a short, scannable list
// while the actions (advance status, edit, start record, history) are one tap
// away.
export function ExpandableJobCard({
  job,
  workers,
  teams,
  customers,
  projects,
  conflict = false,
}: {
  job: ScheduleJobView;
  workers: JobOption[];
  teams: JobOption[];
  customers: JobOption[];
  projects: JobOption[];
  conflict?: boolean;
}) {
  const t = useT().schedule;
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="flex flex-col gap-1">
        <ScheduleJobCard
          job={job}
          workers={workers}
          teams={teams}
          customers={customers}
          projects={projects}
          conflict={conflict}
        />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center gap-1 rounded-lg py-1 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <ChevronDown className="h-3.5 w-3.5 rotate-180" />
          {t.collapseJob}
        </button>
      </div>
    );
  }

  const timeLabel =
    job.startTime && job.endTime
      ? `${job.startTime}–${job.endTime}`
      : job.startTime || t.allDay;
  const who = job.assignedToName ?? job.teamName ?? t.unassigned;
  const canceled = job.status === "CANCELED";

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t.expandJob}
      className={
        "block w-full rounded-lg border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700 " +
        (canceled ? "bg-neutral-50 dark:bg-neutral-900/40" : "dark:bg-neutral-950")
      }
    >
      <div className="flex items-center gap-2">
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
          <Clock className="h-3.5 w-3.5" />
          {timeLabel}
        </span>
        <span
          className={
            "truncate text-sm font-medium " +
            (canceled
              ? "text-neutral-400 line-through dark:text-neutral-500"
              : "text-neutral-900 dark:text-neutral-100")
          }
        >
          {job.title || t.untitled}
        </span>
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
          {who}
          {job.customerName ? ` · ${job.customerName}` : ""}
        </span>
        <ScheduleStatusBadge status={job.status} />
      </div>
    </button>
  );
}
