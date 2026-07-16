"use client";

import { useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsCustomRow } from "@/components/settings/SettingsList";
import { useT } from "@/components/i18n/LocaleProvider";

type EditState = { error?: string; ok?: boolean } | undefined;

// A single settings row that shows a value with a pencil, and expands into an
// inline input + Save/Cancel. Generic over any server action with the
// { error?, ok? } shape (display name, company name). We call the action inside
// a transition and collapse on success; the displayed value comes straight from
// the `value` prop, which the action's revalidatePath refreshes - so there's no
// local mirror state and no state-in-effect.
export function InlineEditRow({
  icon: Icon,
  label,
  value,
  placeholder,
  action,
  helpWhenEditing,
  fieldName = "name",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  placeholder?: string;
  action: (prev: EditState, formData: FormData) => Promise<EditState>;
  helpWhenEditing?: string;
  // The form-field name this row submits. Must match what the server action
  // reads (e.g. the phone action expects "phone", not "name"). Defaults to
  // "name" for the display-name / company-name rows.
  fieldName?: string;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.trim();
    if (!name) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set(fieldName, name);
      const result = await action(undefined, fd);
      if (result?.ok) {
        setEditing(false);
      } else {
        setError(result?.error ?? t.common.saveError);
      }
    });
  }

  if (!editing) {
    return (
      <SettingsCustomRow className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {label}
          </span>
          <span className="truncate text-sm text-neutral-900 dark:text-neutral-100">
            {value || "—"}
          </span>
        </div>
        <button
          type="button"
          onClick={open}
          aria-label={t.common.editField.replace("{field}", label.toLowerCase())}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <Pencil className="h-3.5 w-3.5" />
          {t.common.edit}
        </button>
      </SettingsCustomRow>
    );
  }

  return (
    <SettingsCustomRow>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <label
          htmlFor={`edit-${label}`}
          className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500"
        >
          {label}
        </label>
        <div className="flex items-center gap-2">
          <Input
            id={`edit-${label}`}
            name={fieldName}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            autoFocus
            required
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={pending || draft.trim().length === 0}
            aria-label={t.common.save}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => setEditing(false)}
            aria-label={t.common.cancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {error ? (
          <p className="text-xs text-destructive-text">{error}</p>
        ) : (
          helpWhenEditing && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {helpWhenEditing}
            </p>
          )
        )}
      </form>
    </SettingsCustomRow>
  );
}
