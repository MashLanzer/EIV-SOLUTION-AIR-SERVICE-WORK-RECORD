"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { ScheduledJobStatus } from "@prisma/client";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  FilePlus2,
  Hammer,
  History,
  MapPin,
  Navigation,
  Pencil,
  PlayCircle,
  RotateCcw,
  Trash2,
  User as UserIcon,
  Users2,
  Wrench,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { JobStatusTimeline } from "@/components/schedule/JobStatusTimeline";
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
  requiredSkill: string | null;
  // True when the job needs a skill the assigned worker doesn't have.
  skillMismatch: boolean;
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
  statusHistory: { status: ScheduledJobStatus; actorName: string; time: string }[];
}

export function ScheduleJobCard({
  job,
  workers,
  teams,
  customers,
  projects,
  workerSkills,
  skillSuggestions,
  conflict = false,
}: {
  job: ScheduleJobView;
  workers: JobOption[];
  teams: JobOption[];
  customers: JobOption[];
  projects: JobOption[];
  workerSkills?: Record<string, string[]>;
  skillSuggestions?: string[];
  // The assigned worker has another timed job that overlaps this one this day.
  conflict?: boolean;
}) {
  const t = useT().schedule;
  const tc = useT().common;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function setStatus(status: ScheduledJobStatus) {
    startTransition(() => setJobStatusAction(job.id, status));
  }

  // Open the office "start record" bottom sheet for this job, keeping the
  // current view/day/filters in the URL.
  function openStartRecord() {
    const p = new URLSearchParams(searchParams.toString());
    p.set("record", job.id);
    router.push(`/admin/schedule?${p.toString()}`, { scroll: false });
  }

  const timeLabel =
    job.startTime && job.endTime
      ? `${job.startTime}–${job.endTime}`
      : job.startTime || t.allDay;

  const canceled = job.status === "CANCELED";

  // The single next step in the lifecycle, so the card shows one forward button
  // at a time (Scheduled → Start → On my way → Start work → Done) instead of all
  // at once. Each tap advances the status and is recorded in the status history.
  const nextStep =
    job.status === "SCHEDULED"
      ? { to: "STARTED" as const, label: t.markStarted, Icon: PlayCircle }
      : job.status === "STARTED"
        ? { to: "EN_ROUTE" as const, label: t.markEnRoute, Icon: Navigation }
        : job.status === "EN_ROUTE"
          ? { to: "IN_PROGRESS" as const, label: t.markInProgress, Icon: Hammer }
          : job.status === "IN_PROGRESS"
            ? { to: "DONE" as const, label: t.markDone, Icon: CheckCircle2 }
            : null;

  return (
    <>
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
        <div className="flex shrink-0 flex-col items-end gap-1">
          <ScheduleStatusBadge status={job.status} />
          {conflict && !canceled && (
            <Badge variant="warning" title={t.conflictTitle}>
              <AlertTriangle className="h-3 w-3" />
              {t.conflictBadge}
            </Badge>
          )}
          {job.skillMismatch && !canceled && (
            <Badge variant="warning" title={t.skillMismatchTitle}>
              <AlertTriangle className="h-3 w-3" />
              {t.skillMismatchBadge}
            </Badge>
          )}
        </div>
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
        {job.requiredSkill && (
          <span
            className={
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium " +
              (job.skillMismatch
                ? "bg-warning-soft text-warning-text"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300")
            }
          >
            <Wrench className="h-3 w-3 shrink-0" />
            {job.requiredSkill}
          </span>
        )}
      </div>

      {job.notes && (
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-neutral-500 dark:text-neutral-400">
          {job.notes}
        </p>
      )}

      {/* Linked work record: the calendar job ties into the rest of the app —
          filing a record from this job auto-marks it Done and links the two.
          When none exists yet, the office can start one straight from here and
          credit it to whichever worker actually did the job. */}
      {job.workRecordId ? (
        <Link
          href={`/admin/records/${job.workRecordId}`}
          className="mt-3 flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-sm transition-colors hover:border-neutral-300 dark:hover:border-neutral-700"
        >
          <ExternalLink className="h-4 w-4 shrink-0 text-neutral-400" />
          <span className="flex-1 truncate text-neutral-700 dark:text-neutral-200">
            {t.viewRecord}
            {job.workRecordJobNumber ? ` · #${job.workRecordJobNumber}` : ""}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-neutral-400" />
        </Link>
      ) : (
        !canceled && (
          <button
            type="button"
            onClick={openStartRecord}
            className="mt-3 flex w-full items-center gap-2 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-3 py-2 text-sm transition-colors hover:border-neutral-400 dark:hover:border-neutral-600"
          >
            <FilePlus2 className="h-4 w-4 shrink-0 text-neutral-400" />
            <span className="flex-1 truncate text-left font-medium text-neutral-700 dark:text-neutral-200">
              {t.startRecord}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-neutral-400" />
          </button>
        )
      )}

      {/* Actions: forward status steps on the left, manage (cancel/edit/delete)
          as icons on the right. */}
      <div className="mt-3 flex items-center gap-1.5 border-t border-neutral-100 dark:border-neutral-800 pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {nextStep ? (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => setStatus(nextStep.to)}
            >
              <nextStep.Icon className="h-3.5 w-3.5" />
              {nextStep.label}
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setStatus("SCHEDULED")}>
              <RotateCcw className="h-3.5 w-3.5" />
              {t.reopen}
            </Button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          {(job.status === "SCHEDULED" || job.status === "STARTED" || job.status === "EN_ROUTE" || job.status === "IN_PROGRESS") && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label={t.markCanceled}
              title={t.markCanceled}
              className="text-neutral-500 dark:text-neutral-400"
              onClick={() => setStatus("CANCELED")}
            >
              <XCircle className="h-4 w-4" />
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

      {job.statusHistory.length > 0 && (
        <details className="group mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 [&::-webkit-details-marker]:hidden">
            <History className="h-3.5 w-3.5" />
            {t.statusHistory}
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-3 pl-1">
            <JobStatusTimeline events={job.statusHistory} />
          </div>
        </details>
      )}
    </div>

    <BottomSheet open={editing} onClose={() => setEditing(false)} title={t.editJob} closeLabel={tc.close}>
      <ScheduleJobForm
        jobId={job.id}
        defaultValues={{
          title: job.title,
          scheduledFor: job.scheduledFor,
          startTime: job.startTime ?? "",
          endTime: job.endTime ?? "",
          requiredSkill: job.requiredSkill ?? "",
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
        workerSkills={workerSkills}
        skillSuggestions={skillSuggestions}
        onDone={() => setEditing(false)}
        fullWidth
      />
    </BottomSheet>
    </>
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
