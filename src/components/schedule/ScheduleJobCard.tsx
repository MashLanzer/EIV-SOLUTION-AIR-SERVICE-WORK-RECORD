"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ScheduledJobStatus } from "@prisma/client";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Pencil,
  PlayCircle,
  RotateCcw,
  Trash2,
  User as UserIcon,
  Users2,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScheduleStatusBadge } from "@/components/schedule/ScheduleStatusBadge";
import {
  ScheduleJobForm,
  type JobOption,
} from "@/components/schedule/ScheduleJobForm";
import { deleteScheduledJobAction, setJobStatusAction } from "@/actions/schedule";
import { useT } from "@/components/i18n/LocaleProvider";

export interface ScheduleJobView {
  id: string;
  title: string;
  notes: string | null;
  scheduledFor: string; // YYYY-MM-DD
  startTime: string | null;
  endTime: string | null;
  status: ScheduledJobStatus;
  assignedToId: string | null;
  assignedToName: string | null;
  teamId: string | null;
  teamName: string | null;
  teamColor: string | null;
  customerId: string | null;
  customerName: string | null;
  projectId: string | null;
  projectName: string | null;
  workRecordId: string | null;
  workRecordJobNumber: string | null;
}

export function ScheduleJobCard({
  job,
  workers,
  teams,
  customers,
  projects,
}: {
  job: ScheduleJobView;
  workers: JobOption[];
  teams: JobOption[];
  customers: JobOption[];
  projects: JobOption[];
}) {
  const t = useT().schedule;
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function setStatus(status: ScheduledJobStatus) {
    startTransition(() => setJobStatusAction(job.id, status));
  }

  const timeLabel =
    job.startTime && job.endTime
      ? `${job.startTime}–${job.endTime}`
      : job.startTime || t.allDay;

  const canceled = job.status === "CANCELED";

  if (editing) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
        <ScheduleJobForm
          jobId={job.id}
          defaultValues={{
            title: job.title,
            scheduledFor: job.scheduledFor,
            startTime: job.startTime ?? "",
            endTime: job.endTime ?? "",
            assignedToId: job.assignedToId ?? "",
            teamId: job.teamId ?? "",
            customerId: job.customerId ?? "",
            projectId: job.projectId ?? "",
            notes: job.notes ?? "",
          }}
          workers={workers}
          teams={teams}
          customers={customers}
          projects={projects}
          onDone={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div
      className={cnCard(canceled)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            {timeLabel}
          </div>
          <h3
            className={
              "mt-0.5 truncate font-semibold " +
              (canceled
                ? "text-neutral-400 line-through dark:text-neutral-500"
                : "text-neutral-900 dark:text-neutral-100")
            }
          >
            {job.title || t.untitled}
          </h3>
        </div>
        <ScheduleStatusBadge status={job.status} />
      </div>

      {/* Who / where */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-600 dark:text-neutral-300">
        <span className="flex items-center gap-1.5">
          {job.teamId ? (
            <>
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600"
                style={job.teamColor ? { backgroundColor: job.teamColor } : undefined}
              />
              {job.assignedToName ?? job.teamName}
            </>
          ) : job.assignedToName ? (
            <>
              <UserIcon className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
              {job.assignedToName}
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
              <Users2 className="h-3.5 w-3.5 shrink-0" />
              {t.unassigned}
            </span>
          )}
        </span>
        {job.customerName && (
          <span className="truncate">{job.customerName}</span>
        )}
        {job.projectName && (
          <Link
            href={`/admin/projects/${job.projectId}`}
            className="flex items-center gap-1 truncate hover:text-primary"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
            {job.projectName}
          </Link>
        )}
      </div>

      {job.notes && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-neutral-500 dark:text-neutral-400">
          {job.notes}
        </p>
      )}

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-3">
        {job.status === "SCHEDULED" && (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setStatus("IN_PROGRESS")}>
            <PlayCircle className="h-3.5 w-3.5" />
            {t.markInProgress}
          </Button>
        )}
        {(job.status === "SCHEDULED" || job.status === "IN_PROGRESS") && (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setStatus("DONE")}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t.markDone}
          </Button>
        )}
        {(job.status === "DONE" || job.status === "CANCELED") && (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setStatus("SCHEDULED")}>
            <RotateCcw className="h-3.5 w-3.5" />
            {t.reopen}
          </Button>
        )}
        {job.workRecordId && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/records/${job.workRecordId}`}>
              <ExternalLink className="h-3.5 w-3.5" />
              {t.viewRecord}
            </Link>
          </Button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {(job.status === "SCHEDULED" || job.status === "IN_PROGRESS") && (
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setStatus("CANCELED")}>
              <XCircle className="h-3.5 w-3.5" />
              {t.markCanceled}
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" aria-label={t.edit} onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            title={t.deleteTitle}
            description={t.deleteDesc}
            confirmLabel={t.deleteConfirm}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t.deleteAria.replace("{title}", job.title || t.untitled)}
                className="text-destructive-text"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            }
            onConfirm={() => deleteScheduledJobAction(job.id)}
          />
        </div>
      </div>
    </div>
  );
}

// A canceled job reads as muted so it stays visible (audit trail) without
// competing with live work for attention.
function cnCard(canceled: boolean): string {
  return (
    "rounded-lg border p-3 transition-colors " +
    (canceled
      ? "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40"
      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950")
  );
}
