"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarPlus, Clock, MapPin, Repeat, Save, Users } from "lucide-react";

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
import { cn } from "@/lib/utils";

export interface JobOption {
  id: string;
  name: string;
}

export interface JobFormValues {
  title: string;
  scheduledFor: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  requiredSkill: string;
  assignedToId: string;
  teamId: string;
  customerId: string;
  projectId: string;
  notes: string;
}

// A labelled group of fields with a small icon eyebrow, matching the app's
// section rhythm (Dashboard eyebrows, settings groups) so the form reads as
// one system rather than a flat stack of inputs.
function Group({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      {children}
    </div>
  );
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
  workerSkills,
  skillSuggestions,
  loadByDay,
  onDone,
  fullWidth = false,
}: {
  jobId?: string;
  // Pre-fills the date in create mode so a job lands on the day being viewed.
  defaultDate?: string;
  defaultValues?: JobFormValues;
  workers: JobOption[];
  teams: JobOption[];
  customers: JobOption[];
  projects: JobOption[];
  // Stretch the submit/cancel buttons to full width (for use inside a sheet).
  fullWidth?: boolean;
  // Skills per worker id + the org's skill names, so the required-skill field
  // can autocomplete and the worker dropdown can flag who's qualified.
  workerSkills?: Record<string, string[]>;
  skillSuggestions?: string[];
  // Non-canceled job count per day per worker (dateKey -> workerId -> count),
  // to rank the skill-matched suggestions by who's least busy that day.
  loadByDay?: Record<string, Record<string, number>>;
  onDone?: () => void;
}) {
  const t = useT().schedule;
  const tc = useT().common;
  const [requiredSkill, setRequiredSkill] = useState(defaultValues?.requiredSkill ?? "");
  const [date, setDate] = useState(defaultValues?.scheduledFor ?? defaultDate ?? "");
  const [assignedToId, setAssignedToId] = useState(defaultValues?.assignedToId ?? "");
  // Recurrence (create mode only). "none" or weekly/biweekly/monthly; when set,
  // the count field appears and the server materializes the whole series.
  const [repeat, setRepeat] = useState("none");
  const skillNeeded = requiredSkill.trim().toLowerCase();
  const hasSkill = (id: string) =>
    !!skillNeeded &&
    (workerSkills?.[id] ?? []).some((s) => s.toLowerCase() === skillNeeded);

  // Workers who have the required skill, ranked by the lightest load that day -
  // the best person to assign. Empty when no skill is set.
  const loadOf = (id: string) => loadByDay?.[date]?.[id] ?? 0;
  const eligible = skillNeeded ? workers.filter((w) => hasSkill(w.id)) : [];
  const suggestions = [...eligible]
    .sort((a, b) => loadOf(a.id) - loadOf(b.id) || a.name.localeCompare(b.name))
    .slice(0, 3);
  const action = jobId
    ? updateScheduledJobAction.bind(null, jobId)
    : createScheduledJobAction;
  const [state, formAction, pending] = useActionState<ScheduleFormState, FormData>(
    action,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);
  const err = (name: string) => state?.fieldErrors?.[name]?.[0];
  const uid = jobId ?? "new";

  // On a successful save: an edit closes its sheet. A create resets the fields
  // for the next job and closes the sheet too — unless the save came back with a
  // conflict warning, in which case the sheet stays open so the warning is seen.
  // The list itself refreshes via revalidatePath.
  useEffect(() => {
    if (!state?.ok) return;
    if (jobId) {
      onDone?.();
      return;
    }
    // Saved but flagged (e.g. an overlap): keep the sheet open with everything
    // the user typed so the warning is seen and nothing is lost. They close it
    // themselves or adjust and re-save.
    if (state.warning) return;
    // Clean create: reset the fields for the next job and close the sheet.
    // form.reset() clears the uncontrolled fields; the controlled ones (date,
    // worker, required skill) are reset by hand. The reset can only happen here
    // since success is signalled through the post-render state.
    formRef.current?.reset();
    /* eslint-disable react-hooks/set-state-in-effect */
    setDate(defaultDate ?? "");
    setAssignedToId("");
    setRequiredSkill("");
    setRepeat("none");
    /* eslint-enable react-hooks/set-state-in-effect */
    onDone?.();
  }, [state?.ok, state?.warning, jobId, onDone, defaultDate]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      {/* Title - the headline field */}
      <div className="flex flex-col gap-2">
        <Label htmlFor={`title-${uid}`} required>
          {t.jobTitle}
        </Label>
        <Input
          id={`title-${uid}`}
          name="title"
          required
          defaultValue={defaultValues?.title}
          placeholder={t.jobTitlePlaceholder}
          aria-invalid={err("title") ? true : undefined}
        />
        <FieldError id={`title-${uid}-error`} message={err("title")} />
      </div>

      <Group icon={Clock} label={t.groupWhen}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`date-${uid}`} required>
            {t.date}
          </Label>
          <Input
            id={`date-${uid}`}
            name="scheduledFor"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-invalid={err("scheduledFor") ? true : undefined}
          />
          <FieldError id={`date-${uid}-error`} message={err("scheduledFor")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`start-${uid}`}>{t.startTime}</Label>
            <Input
              id={`start-${uid}`}
              name="startTime"
              type="time"
              defaultValue={defaultValues?.startTime}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`end-${uid}`}>{t.endTime}</Label>
            <Input
              id={`end-${uid}`}
              name="endTime"
              type="time"
              defaultValue={defaultValues?.endTime}
              aria-invalid={err("endTime") ? true : undefined}
            />
            <FieldError id={`end-${uid}-error`} message={err("endTime")} />
          </div>
        </div>
      </Group>

      {/* Recurrence — create only. Turns one job into a weekly/biweekly/monthly
          series; each occurrence is then an independent job. */}
      {!jobId && (
        <Group icon={Repeat} label={t.groupRepeat}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`repeat-${uid}`}>{t.repeat}</Label>
              <Select
                id={`repeat-${uid}`}
                name="repeatFreq"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
              >
                <option value="none">{t.repeatNone}</option>
                <option value="weekly">{t.repeatWeekly}</option>
                <option value="biweekly">{t.repeatBiweekly}</option>
                <option value="monthly">{t.repeatMonthly}</option>
              </Select>
            </div>
            {repeat !== "none" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`repeatCount-${uid}`}>{t.repeatCount}</Label>
                <Input
                  id={`repeatCount-${uid}`}
                  name="repeatCount"
                  type="number"
                  min="1"
                  max="51"
                  step="1"
                  inputMode="numeric"
                  defaultValue="4"
                />
              </div>
            )}
          </div>
          {repeat !== "none" && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.repeatHint}</p>
          )}
        </Group>
      )}

      <Group icon={Users} label={t.groupAssign}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`skill-${uid}`}>{t.requiredSkill}</Label>
          <Input
            id={`skill-${uid}`}
            name="requiredSkill"
            value={requiredSkill}
            onChange={(e) => setRequiredSkill(e.target.value)}
            placeholder={t.requiredSkillPlaceholder}
            list={`skill-list-${uid}`}
            autoComplete="off"
          />
          {skillSuggestions && skillSuggestions.length > 0 && (
            <datalist id={`skill-list-${uid}`}>
              {skillSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`worker-${uid}`}>{t.worker}</Label>
            <Select
              id={`worker-${uid}`}
              name="assignedToId"
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
            >
              <option value="">{t.noWorker}</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {hasSkill(w.id) ? " ★" : ""}
                </option>
              ))}
            </Select>
            {skillNeeded &&
              (eligible.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-neutral-500 dark:text-neutral-400">{t.suggestedWorkers}</span>
                  {suggestions.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setAssignedToId(w.id)}
                      title={t.suggestedLoadTitle}
                      className={
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium transition-colors " +
                        (assignedToId === w.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent-soft text-accent-text hover:brightness-95")
                      }
                    >
                      {w.name}
                      <span className="tabular-nums opacity-70">{loadOf(w.id)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{t.noSkilledWorker}</p>
              ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`team-${uid}`}>{t.team}</Label>
            <Select id={`team-${uid}`} name="teamId" defaultValue={defaultValues?.teamId ?? ""}>
              <option value="">{t.noTeam}</option>
              {teams.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Group>

      <Group icon={MapPin} label={t.groupWhere}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`customer-${uid}`}>{t.customer}</Label>
            <Select id={`customer-${uid}`} name="customerId" defaultValue={defaultValues?.customerId ?? ""}>
              <option value="">{t.noCustomer}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`project-${uid}`}>{t.project}</Label>
            <Select id={`project-${uid}`} name="projectId" defaultValue={defaultValues?.projectId ?? ""}>
              <option value="">{t.noProject}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Group>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`notes-${uid}`}>{t.notes}</Label>
        <Textarea
          id={`notes-${uid}`}
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

      <div
        className={cn(
          "flex items-center gap-2",
          fullWidth && "flex-col-reverse items-stretch"
        )}
      >
        <Button type="submit" disabled={pending} className={cn(fullWidth && "w-full")}>
          {jobId ? <Save className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
          {pending ? t.saving : t.saveJob}
        </Button>
        {jobId && onDone && (
          <Button
            type="button"
            variant="outline"
            onClick={onDone}
            disabled={pending}
            className={cn(fullWidth && "w-full")}
          >
            {tc.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}
