"use client";

import { useState, useTransition } from "react";
import { Plus, Sparkles, Tag, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import type { WorkTypeGroup } from "@/lib/workTypes";
import {
  applyStarterPackAction,
  createWorkTypeAction,
  createWorkTypeCategoryAction,
  deleteWorkTypeAction,
  deleteWorkTypeCategoryAction,
  type WorkTypeState,
} from "@/actions/workTypes";

// A single-line "type a name, press add" control. Generic over the action so
// it backs both "add category" and "add work type".
function AddInline({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (formData: FormData) => Promise<WorkTypeState>;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = value.trim();
    if (!name) return;
    setError(null);
    const fd = new FormData();
    fd.set("name", name);
    startTransition(async () => {
      const result = await onAdd(fd);
      if (result?.error) setError(result.error);
      else setValue("");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={pending || value.trim().length === 0} aria-label="Add">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive-text">{error}</p>}
    </form>
  );
}

export function WorkTypesManager({
  groups,
  packs,
}: {
  groups: WorkTypeGroup[];
  packs: { id: string; label: string }[];
}) {
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Starter packs */}
      <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
          <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Start from a template
          </h2>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Add a ready-made set for your trade. Everything stays editable and you can mix packs.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {packs.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => applyStarterPackAction(p.id))}
            >
              <Plus className="h-3.5 w-3.5" />
              {p.label}
            </Button>
          ))}
        </div>
      </section>

      {/* Categories */}
      {groups.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No work types yet"
          description="Add a starter pack above, or create your first category below."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <section
              key={group.id}
              className="flex flex-col gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {group.name}
                </h3>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => deleteWorkTypeCategoryAction(group.id))}
                  aria-label={`Delete category ${group.name}`}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 dark:text-neutral-400 transition-colors hover:bg-destructive-soft hover:text-destructive-text disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>

              {group.items.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 py-1 pl-2.5 pr-1 text-sm text-neutral-800 dark:text-neutral-200"
                    >
                      {item.name}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => deleteWorkTypeAction(item.id))}
                        aria-label={`Remove ${item.name}`}
                        className="flex h-5 w-5 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-50"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <AddInline
                placeholder="Add a work type…"
                onAdd={(fd) => createWorkTypeAction(group.id, undefined, fd)}
              />
            </section>
          ))}
        </div>
      )}

      {/* Add category */}
      <section className="flex flex-col gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
        <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Add a category
        </h2>
        <AddInline
          placeholder="e.g. Installation, Service…"
          onAdd={(fd) => createWorkTypeCategoryAction(undefined, fd)}
        />
      </section>
    </div>
  );
}
