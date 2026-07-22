"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { BellPlus, Check, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addOrgReminderAction,
  completeOrgReminderAction,
  deleteOrgReminderAction,
  type ReminderActionState,
} from "@/actions/orgReminders";
import { SnoozeButton } from "@/components/super/SnoozeButton";
import type { OrgReminderItem } from "@/lib/platform";
import { cn } from "@/lib/utils";

const dueFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <BellPlus className="h-4 w-4" />
      {pending ? "Adding…" : "Add"}
    </Button>
  );
}

function IconSubmit({ label, children }: { label: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      className="shrink-0 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
    >
      {children}
    </button>
  );
}

// Dated follow-ups on a company: add one with a due date, tick it done, or
// delete it. Open items surface on the platform Home when due.
export function OrgRemindersPanel({
  orgId,
  reminders,
}: {
  orgId: string;
  reminders: OrgReminderItem[];
}) {
  const [state, action] = useActionState<ReminderActionState, FormData>(
    addOrgReminderAction.bind(null, orgId),
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const open = reminders.filter((r) => !r.done);
  const done = reminders.filter((r) => r.done);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        <BellPlus className="h-4 w-4" />
        Follow-ups
      </h2>

      <form ref={formRef} action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="rem-note" className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
            What to follow up on
          </label>
          <Input id="rem-note" name="note" placeholder="e.g. Check onboarding progress" required maxLength={300} />
        </div>
        <div>
          <label htmlFor="rem-due" className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
            Due
          </label>
          <Input id="rem-due" name="due" type="date" required className="w-full sm:w-auto" />
        </div>
        <AddButton />
      </form>
      {state.error && <p className="text-xs text-destructive-text">{state.error}</p>}

      {(open.length > 0 || done.length > 0) && (
        <Card>
          <CardContent className="flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
            {open.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap break-words text-sm text-neutral-900 dark:text-neutral-100">
                    {r.note}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs">
                    <span
                      className={cn(
                        "font-medium",
                        r.overdue ? "text-destructive-text" : "text-neutral-500 dark:text-neutral-400"
                      )}
                    >
                      {r.overdue ? "Overdue" : "Due"} {dueFmt.format(r.dueAt)}
                    </span>
                    <span className="text-neutral-400">· {r.createdBy}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center">
                  <SnoozeButton reminderId={r.id} compact />
                  <form action={completeOrgReminderAction.bind(null, r.id)}>
                    <IconSubmit label="Mark done">
                      <Check className="h-4 w-4" />
                    </IconSubmit>
                  </form>
                  <form action={deleteOrgReminderAction.bind(null, r.id)}>
                    <IconSubmit label="Delete">
                      <Trash2 className="h-4 w-4" />
                    </IconSubmit>
                  </form>
                </div>
              </div>
            ))}
            {done.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <p className="min-w-0 truncate text-sm text-neutral-400 line-through">{r.note}</p>
                <form action={deleteOrgReminderAction.bind(null, r.id)}>
                  <IconSubmit label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </IconSubmit>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
