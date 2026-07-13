"use client";

import { useActionState, useEffect, useRef } from "react";
import { CalendarPlus, Save } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createScheduledJobAction,
  updateScheduledJobAction,
  type ScheduleFormState,
} from "@/actions/schedule";
import { useT } from "@/components/i18n/LocaleProvider";

export interface JobOption {
  id: string;
  name: string;
}

export interface JobFormValues {
  title: string;
  scheduledFor: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  assignedToId: string;
  teamId: string;
  customerId: string;
  projectId: string;
  notes: string;
}

// The create/edit form for a scheduled job. In create mode it lives in the
// collapsible panel at the top of the schedule page and resets itself after a
// save; in edit mode it renders inline inside a job card and closes via onDone.
export function ScheduleJobForm({
  jobId,
  defaultDate,
  defaultValues,
  workers,
  teams,
  customers,
  projects,
  onDone,
}: {
  jobId?: string;
  // Pre-fills the date in create mode so a job lands on the day being viewed.
  defaultDate?: string;
  defaultValues?: JobFormValues;
  workers: JobOption[];
  teams: JobOption[];
  customers: JobOption[];
  projects: JobOption[];
  onDone?: () => void;
}) {
  const t = useT().schedule;
  const tc = useT().common;
  const action = jobId
    ? updateScheduledJobAction.bind(null, jobId)
    : createScheduledJobAction;
  const [state, formAction, pending] = useActionState<ScheduleFormState, FormData>(
    action,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);
  const err = (name: string) => state?.fieldErrors?.[name]?.[0];

  // On a successful save: an inline editor collapses; the create form resets
  // so the next job starts blank. The list itself refreshes via revalidatePath.
  useEffect(() => {
    if (!state?.ok) return;
    if (jobId) {
      onDone?.();
    } else {
      formRef.current?.reset();
    }
  }, [state?.ok, jobId, onDone]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`title-${jobId ?? "new"}`} required>
          {t.jobTitle}
        </Label>
        <Input
          id={`title-${jobId ?? "new"}`}
          name="title"
          required
          defaultValue={defaultValues?.title}
          placeholder={t.jobTitlePlaceholder}
          aria-invalid={err("title") ? true : undefined}
        />
        <FieldError id={`title-${jobId ?? "new"}-error`} message={err("title")} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`date-${jobId ?? "new"}`} required>
            {t.date}
          </Label>
          <Input
            id={`date-${jobId ?? "new"}`}
            name="scheduledFor"
            type="date"
            required
            defaultValue={defaultValues?.scheduledFor ?? defaultDate}
            aria-invalid={err("scheduledFor") ? true : undefined}
          />
          <FieldError id={`date-${jobId ?? "new"}-error`} message={err("scheduledFor")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`start-${jobId ?? "new"}`}>{t.startTime}</Label>
          <Input
            id={`start-${jobId ?? "new"}`}
            name="startTime"
            type="time"
            defaultValue={defaultValues?.startTime}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`end-${jobId ?? "new"}`}>{t.endTime}</Label>
          <Input
            id={`end-${jobId ?? "new"}`}
            name="endTime"
            type="time"
            defaultValue={defaultValues?.endTime}
            aria-invalid={err("endTime") ? true : undefined}
          />
          <FieldError id={`end-${jobId ?? "new"}-error`} message={err("endTime")} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`worker-${jobId ?? "new"}`}>{t.worker}</Label>
          <Select
            id={`worker-${jobId ?? "new"}`}
            name="assignedToId"
            defaultValue={defaultValues?.assignedToId ?? ""}
          >
            <option value="">{t.noWorker}</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`team-${jobId ?? "new"}`}>{t.team}</Label>
          <Select
            id={`team-${jobId ?? "new"}`}
            name="teamId"
            defaultValue={defaultValues?.teamId ?? ""}
          >
            <option value="">{t.noTeam}</option>
            {teams.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`customer-${jobId ?? "new"}`}>{t.customer}</Label>
          <Select
            id={`customer-${jobId ?? "new"}`}
            name="customerId"
            defaultValue={defaultValues?.customerId ?? ""}
          >
            <option value="">{t.noCustomer}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`project-${jobId ?? "new"}`}>{t.project}</Label>
          <Select
            id={`project-${jobId ?? "new"}`}
            name="projectId"
            defaultValue={defaultValues?.projectId ?? ""}
          >
            <option value="">{t.noProject}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`notes-${jobId ?? "new"}`}>{t.notes}</Label>
        <Textarea
          id={`notes-${jobId ?? "new"}`}
          name="notes"
          rows={2}
          defaultValue={defaultValues?.notes}
          placeholder={t.notesPlaceholder}
        />
      </div>

      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {state?.ok && state.warning === "conflict" && (
        <Alert variant="warning">{t.conflictWarning}</Alert>
      )}
      {state?.ok && !state.warning && !jobId && (
        <Alert variant="success">{t.saved}</Alert>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {jobId ? <Save className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
          {pending ? t.saving : t.saveJob}
        </Button>
        {jobId && onDone && (
          <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
            {tc.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}
