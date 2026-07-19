"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ScheduledJobStatus } from "@prisma/client";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FilePlus2,
  FolderKanban,
  Hammer,
  Info,
  MapPin,
  Navigation,
  Phone,
  PlayCircle,
  Truck,
} from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { JobStatusTimeline, type TimelineEvent } from "@/components/schedule/JobStatusTimeline";
import { ScheduleStatusBadge } from "@/components/schedule/ScheduleStatusBadge";
import { setJobStatusAction } from "@/actions/schedule";
import { useT } from "@/components/i18n/LocaleProvider";
import { useUse24Hour } from "@/components/i18n/TimeFormatProvider";
import { formatTimeRange } from "@/lib/format";

export interface WorkerJobView {
  id: string;
  title: string;
  notes: string | null;
  startTime: string | null;
  endTime: string | null;
  status: ScheduledJobStatus;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  projectId: string | null;
  projectName: string | null;
  projectAddress: string | null;
  workRecordId: string | null;
  statusHistory: TimelineEvent[];
}

// Directions link: prefer the project's address, else the customer's.
function directionsHref(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    address
  )}`;
}

// A worker's read-mostly job card: see the visit, get directions, start its
// record, and flip status as they work it. Simpler than the admin card - no
// reassigning or deleting.
export function WorkerJobCard({ job }: { job: WorkerJobView }) {
  const t = useT().schedule;
  const tc = useT().common;
  const [pending, startTransition] = useTransition();
  const [detailsOpen, setDetailsOpen] = useState(false);

  function setStatus(status: ScheduledJobStatus) {
    startTransition(() => setJobStatusAction(job.id, status));
  }

  const timeLabel = formatTimeRange(job.startTime, job.endTime, useUse24Hour(), t.allDay);
  const address = job.projectAddress || job.customerAddress || null;
  const phone = job.customerPhone?.trim() || null;

  // One forward step at a time (Scheduled → Start → On my way → Start work →
  // Done); each tap advances the status and lands in the job's history.
  const nextStep =
    job.status === "SCHEDULED"
      ? { to: "STARTED" as const, label: t.markStarted, Icon: PlayCircle }
      : job.status === "STARTED"
        ? { to: "EN_ROUTE" as const, label: t.markEnRoute, Icon: Truck }
        : job.status === "EN_ROUTE"
          ? { to: "IN_PROGRESS" as const, label: t.markInProgress, Icon: Hammer }
          : job.status === "IN_PROGRESS"
            ? { to: "DONE" as const, label: t.markDone, Icon: CheckCircle2 }
            : null;

  // Start-or-view-record shortcut, shared by the card footer and the details
  // sheet so both lead to the same next action.
  const recordAction = job.workRecordId ? (
    <Button asChild variant="outline" size="sm">
      <Link href={`/records/${job.workRecordId}`}>
        <ExternalLink className="h-3.5 w-3.5" />
        {t.viewRecord}
      </Link>
    </Button>
  ) : (
    <Button asChild size="sm">
      <Link href={`/records/new?jobId=${job.id}`}>
        <FilePlus2 className="h-3.5 w-3.5" />
        {t.startRecord}
      </Link>
    </Button>
  );

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {timeLabel}
          </div>
          <h3 className="mt-0.5 truncate font-semibold text-neutral-900 dark:text-neutral-100">
            {job.title || t.untitled}
          </h3>
        </div>
        <ScheduleStatusBadge status={job.status} />
      </div>

      {(job.customerName || job.projectName) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-600 dark:text-neutral-300">
          {job.customerName && <span className="truncate">{job.customerName}</span>}
          {job.projectName && (
            <Link
              href={`/records/projects/${job.projectId}`}
              className="flex items-center gap-1 truncate hover:text-primary"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
              {job.projectName}
            </Link>
          )}
        </div>
      )}

      {job.notes && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-neutral-500 dark:text-neutral-400">
          {job.notes}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-3">
        {nextStep && (
          <Button type="button" size="sm" disabled={pending} onClick={() => setStatus(nextStep.to)}>
            <nextStep.Icon className="h-3.5 w-3.5" />
            {nextStep.label}
          </Button>
        )}
        {address && (
          <Button asChild variant="ghost" size="sm">
            <a href={directionsHref(address)} target="_blank" rel="noopener noreferrer">
              <Navigation className="h-3.5 w-3.5" />
              {t.directions}
            </a>
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={() => setDetailsOpen(true)}>
          <Info className="h-3.5 w-3.5" />
          {t.details}
        </Button>

        <div className="ml-auto">{recordAction}</div>
      </div>

      {/* Full job view: contact the customer, jump to the project, read the whole
          note, and see the status history — the details a field worker triages
          without leaving the day. The card keeps the one-tap status stepper. */}
      <BottomSheet
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={job.title || t.untitled}
        closeLabel={tc.close}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-medium tabular-nums text-neutral-700 dark:text-neutral-200">
              <Clock className="h-4 w-4 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
              {timeLabel}
            </span>
            <ScheduleStatusBadge status={job.status} />
          </div>

          {(job.customerName || address) && (
            <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
              {job.customerName && (
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {job.customerName}
                </span>
              )}
              {job.customerAddress && (
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {job.customerAddress}
                </span>
              )}
              <div className="flex flex-wrap gap-2 pt-0.5">
                {address && (
                  <a
                    href={directionsHref(address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                    {t.directions}
                  </a>
                )}
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    {t.call}
                  </a>
                )}
              </div>
            </div>
          )}

          {job.projectName && (
            <Link
              href={`/records/projects/${job.projectId}`}
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
              {job.projectName}
            </Link>
          )}

          {job.notes && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {t.notes}
              </span>
              <p className="whitespace-pre-wrap break-words text-sm text-neutral-700 dark:text-neutral-200">
                {job.notes}
              </p>
            </div>
          )}

          {job.statusHistory.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {t.statusHistory}
              </span>
              <JobStatusTimeline events={job.statusHistory} />
            </div>
          )}

          <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
            {recordAction}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
