"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { ScheduledJobStatus } from "@prisma/client";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  FilePlus2,
  Hammer,
  MapPin,
  Navigation,
  PlayCircle,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
  projectId: string | null;
  projectName: string | null;
  projectAddress: string | null;
  workRecordId: string | null;
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
  const [pending, startTransition] = useTransition();

  function setStatus(status: ScheduledJobStatus) {
    startTransition(() => setJobStatusAction(job.id, status));
  }

  const timeLabel = formatTimeRange(job.startTime, job.endTime, useUse24Hour(), t.allDay);
  const address = job.projectAddress || job.customerAddress || null;

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

        <div className="ml-auto">
          {job.workRecordId ? (
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
          )}
        </div>
      </div>
    </div>
  );
}
