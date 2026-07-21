"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { StickyNote, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  addOrgNoteAction,
  deleteOrgNoteAction,
  type NoteActionState,
} from "@/actions/orgNotes";

type Note = {
  id: string;
  body: string;
  authorEmail: string;
  createdAt: Date;
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : "Add note"}
    </Button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Delete note"
      className="shrink-0 rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-destructive-text disabled:opacity-50 dark:hover:bg-neutral-800"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

// Private, platform-only notes on a company. Only ever rendered inside /super,
// so nothing here leaks to the tenant. Add form clears itself on success; each
// note has an inline delete.
export function OrgNotesPanel({ orgId, notes }: { orgId: string; notes: Note[] }) {
  const [state, action] = useActionState<NoteActionState, FormData>(
    addOrgNoteAction.bind(null, orgId),
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        <StickyNote className="h-4 w-4" />
        Internal notes
      </h2>

      <form ref={formRef} action={action} className="flex flex-col gap-2">
        <textarea
          name="body"
          rows={2}
          maxLength={2000}
          placeholder="Private note about this company (not visible to them)…"
          className="w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
        />
        <div className="flex items-center justify-between gap-3">
          {state.error ? (
            <p className="text-xs text-destructive-text">{state.error}</p>
          ) : (
            <span className="text-xs text-neutral-400">Only the platform team can see these.</span>
          )}
          <SaveButton />
        </div>
      </form>

      {notes.length > 0 && (
        <Card>
          <CardContent className="flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
            {notes.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap break-words text-sm text-neutral-900 dark:text-neutral-100">
                    {n.body}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {n.authorEmail} · {dateFmt.format(n.createdAt)}
                  </p>
                </div>
                <form action={deleteOrgNoteAction.bind(null, n.id)}>
                  <DeleteButton />
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
