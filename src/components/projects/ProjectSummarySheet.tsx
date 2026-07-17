"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, Gauge, ListChecks } from "lucide-react";
import type { RecordStatus } from "@prisma/client";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { StatusBadge } from "@/components/records/StatusBadge";
import { useT } from "@/components/i18n/LocaleProvider";

export interface ProjectSummaryRecord {
  id: string;
  jobNumber: string;
  dateLabel: string;
  typeOfWork: string;
  status: RecordStatus;
}

// The project's numbers, tucked into a bottom sheet so the Overview tab can lead
// with at-a-glance tiles instead of one dense card. Opens a breakdown by record
// status, checklist progress, when the project was created, and its most recent
// records (each a shortcut into that record).
export function ProjectSummarySheet({
  status,
  checklist,
  createdLabel,
  recent,
  recordHrefBase,
}: {
  status: { approved: number; pending: number; needsChanges: number; total: number };
  checklist: { done: number; total: number; pct: number } | null;
  createdLabel: string;
  recent: ProjectSummaryRecord[];
  recordHrefBase: string;
}) {
  const t = useT().projects;
  const tr = useT().records;
  const tc = useT().common;
  const [open, setOpen] = useState(false);

  // Proportional bar for a status count against the busiest bucket, so the bars
  // read as a mini distribution rather than tiny slivers.
  const peak = Math.max(status.approved, status.pending, status.needsChanges, 1);
  const rows: { label: string; count: number; tone: string }[] = [
    { label: t.approved, count: status.approved, tone: "bg-success-text" },
    { label: t.pending, count: status.pending, tone: "bg-neutral-900 dark:bg-neutral-100" },
    { label: t.needsChanges, count: status.needsChanges, tone: "bg-warning-text" },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          <Gauge className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {t.projectDetails}
          </span>
          <span className="block text-xs text-neutral-500 dark:text-neutral-400">
            {t.projectDetailsHint}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={t.projectDetails} closeLabel={tc.close}>
        <div className="flex flex-col gap-5">
          {/* Records by status */}
          <section className="flex flex-col gap-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {t.workRecords}
            </h3>
            {status.total === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.noWorkRecords}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {rows.map((r) => (
                  <div key={r.label} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-sm text-neutral-600 dark:text-neutral-300">
                      {r.label}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className={`h-full rounded-full ${r.tone}`}
                        style={{ width: `${Math.round((r.count / peak) * 100)}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                      {r.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Checklist progress */}
          {checklist && checklist.total > 0 && (
            <section className="flex flex-col gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium text-neutral-900 dark:text-neutral-100">
                  <ListChecks className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                  {t.checklistProgress}
                </span>
                <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                  {checklist.done}/{checklist.total} · {checklist.pct}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div
                  className="h-full rounded-full bg-neutral-900 dark:bg-neutral-100"
                  style={{ width: `${checklist.pct}%` }}
                />
              </div>
            </section>
          )}

          {/* Recent records */}
          {recent.length > 0 && (
            <section className="flex flex-col gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {t.recentRecords}
              </h3>
              <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                {recent.map((r) => (
                  <Link
                    key={r.id}
                    href={`${recordHrefBase}${r.id}`}
                    className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          {tr.jobNumber}{r.jobNumber}
                        </span>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {r.dateLabel} · {r.typeOfWork}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-500 dark:text-neutral-600 dark:group-hover:text-neutral-400" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Created */}
          <div className="flex items-center gap-1.5 border-t border-neutral-100 pt-4 text-sm text-neutral-500 dark:text-neutral-400 dark:border-neutral-800">
            <CalendarDays className="h-4 w-4 shrink-0" />
            {createdLabel}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
