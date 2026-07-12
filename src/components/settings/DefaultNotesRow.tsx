"use client";

import { useState, useTransition } from "react";
import { Check, FileText, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SettingsCustomRow } from "@/components/settings/SettingsList";
import { setDefaultWorkNotesAction } from "@/actions/organization";

// The default "work performed" notes template. Shows the current text (or a
// placeholder) with a pencil; expands into a textarea + Save/Cancel. Unlike a
// single-line field this can be cleared to empty. The value comes from the
// `value` prop, refreshed by the action's revalidate.
export function DefaultNotesRow({ value }: { value: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();

  function open() {
    setDraft(value);
    setEditing(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.set("notes", draft);
      const result = await setDefaultWorkNotesAction(undefined, fd);
      if (result?.ok) setEditing(false);
    });
  }

  if (!editing) {
    return (
      <SettingsCustomRow className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
          <FileText className="h-4.5 w-4.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Default work notes
          </span>
          <span className="whitespace-pre-wrap break-words text-sm text-neutral-900 dark:text-neutral-100">
            {value || "—"}
          </span>
        </div>
        <button
          type="button"
          onClick={open}
          aria-label="Edit default work notes"
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      </SettingsCustomRow>
    );
  }

  return (
    <SettingsCustomRow>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <label
          htmlFor="default-work-notes"
          className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"
        >
          Default work notes
        </label>
        <Textarea
          id="default-work-notes"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. Performed standard maintenance. Checked filters, refrigerant and connections."
          rows={4}
          autoFocus
        />
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            <Check className="h-4 w-4" />
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing(false)}
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Pre-fills the work-performed notes on a new record; leave blank for none.
        </p>
      </form>
    </SettingsCustomRow>
  );
}
