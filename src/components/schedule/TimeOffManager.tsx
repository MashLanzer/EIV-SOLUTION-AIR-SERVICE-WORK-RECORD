"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarOff, Plus, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  addTimeOffAction,
  deleteTimeOffAction,
  type TimeOffFormState,
} from "@/actions/timeOff";
import { useT } from "@/components/i18n/LocaleProvider";

export interface TimeOffEntry {
  id: string;
  workerName: string;
  // Pre-formatted, locale-aware range label built on the server.
  range: string;
  reason: string | null;
}

// The office manages worker time off (vacation / sick / personal) from the
// schedule: a header button opens a bottom sheet (driven by ?timeoff=1) that
// lists upcoming time off and adds more. Mirrors the new-job sheet pattern so
// every entry point that links with ?timeoff=1 opens the same sheet.
export function TimeOffManager({
  workers,
  entries,
  defaultDate,
}: {
  workers: { id: string; name: string }[];
  entries: TimeOffEntry[];
  defaultDate?: string;
}) {
  const t = useT().schedule;
  const tc = useT().common;
  const params = useSearchParams();
  const router = useRouter();
  const open = params.get("timeoff") === "1";

  function setOpen(next: boolean) {
    const p = new URLSearchParams(params.toString());
    if (next) p.set("timeoff", "1");
    else p.delete("timeoff");
    const qs = p.toString();
    router.replace(qs ? `/admin/schedule?${qs}` : "/admin/schedule", { scroll: false });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarOff className="h-4 w-4" />
        <span className="hidden sm:inline">{t.timeOffTitle}</span>
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t.timeOffTitle} closeLabel={tc.close}>
        <div className="flex flex-col gap-5">
          <TimeOffForm workers={workers} defaultDate={defaultDate} />
          <TimeOffList entries={entries} />
        </div>
      </BottomSheet>
    </>
  );
}

function TimeOffForm({
  workers,
  defaultDate,
}: {
  workers: { id: string; name: string }[];
  defaultDate?: string;
}) {
  const t = useT().schedule;
  const [state, formAction, pending] = useActionState<TimeOffFormState, FormData>(
    addTimeOffAction,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [start, setStart] = useState(defaultDate ?? "");
  const [end, setEnd] = useState(defaultDate ?? "");
  const err = (name: string) => state?.fieldErrors?.[name]?.[0];

  // Reset the fields after a clean add so the next entry starts fresh.
  useEffect(() => {
    if (!state?.ok) return;
    formRef.current?.reset();
    /* eslint-disable react-hooks/set-state-in-effect */
    setStart(defaultDate ?? "");
    setEnd(defaultDate ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [state?.ok, defaultDate]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="timeoff-worker" required>
          {t.worker}
        </Label>
        <Select id="timeoff-worker" name="userId" defaultValue="" aria-invalid={err("userId") ? true : undefined}>
          <option value="" disabled>
            {t.timeOffPickWorker}
          </option>
          {workers.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
        <FieldError id="timeoff-worker-error" message={err("userId")} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="timeoff-start" required>
            {t.timeOffStart}
          </Label>
          <Input
            id="timeoff-start"
            name="startDate"
            type="date"
            required
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              // Keep the end on/after the start so the range stays valid.
              if (!end || end < e.target.value) setEnd(e.target.value);
            }}
            aria-invalid={err("startDate") ? true : undefined}
          />
          <FieldError id="timeoff-start-error" message={err("startDate")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="timeoff-end" required>
            {t.timeOffEnd}
          </Label>
          <Input
            id="timeoff-end"
            name="endDate"
            type="date"
            required
            min={start || undefined}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            aria-invalid={err("endDate") ? true : undefined}
          />
          <FieldError id="timeoff-end-error" message={err("endDate")} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="timeoff-reason">{t.timeOffReason}</Label>
        <Input id="timeoff-reason" name="reason" placeholder={t.timeOffReasonPlaceholder} maxLength={120} />
      </div>
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      <Button type="submit" disabled={pending} className="w-full">
        <Plus className="h-4 w-4" />
        {pending ? t.saving : t.timeOffAdd}
      </Button>
    </form>
  );
}

function TimeOffList({ entries }: { entries: TimeOffEntry[] }) {
  const t = useT().schedule;
  if (entries.length === 0) {
    return (
      <div className="border-t border-neutral-100 pt-4 dark:border-neutral-800">
        <EmptyState icon={CalendarOff} title={t.timeOffEmpty} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {t.timeOffUpcoming}
      </h3>
      <ul className="flex flex-col gap-1.5">
        {entries.map((e) => (
          <TimeOffRow key={e.id} entry={e} />
        ))}
      </ul>
    </div>
  );
}

function TimeOffRow({ entry }: { entry: TimeOffEntry }) {
  const t = useT().schedule;
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-800">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {entry.workerName}
        </span>
        <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
          {entry.range}
          {entry.reason ? ` · ${entry.reason}` : ""}
        </span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={pending}
        aria-label={t.timeOffRemove}
        title={t.timeOffRemove}
        className="text-destructive-text"
        onClick={() => startTransition(() => deleteTimeOffAction(entry.id))}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </li>
  );
}
