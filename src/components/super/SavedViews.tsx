"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookmarkPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveViewAction, deleteSavedViewAction, type SavedViewState } from "@/actions/savedViews";
import type { SavedView } from "@/lib/platform";
import { cn } from "@/lib/utils";

// Quick-access chips for saved Companies filter combinations. Each chip links to
// its stored query; the active chip (matching the current query) is highlighted.
// "Save view" captures the current filters under a name.
export function SavedViews({
  views,
  currentQuery,
}: {
  views: SavedView[];
  currentQuery: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<SavedViewState, FormData>(
    saveViewAction.bind(null, currentQuery),
    {}
  );

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const alreadySaved = views.some((v) => v.query === currentQuery);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {views.map((v) => {
        const active = v.query === currentQuery;
        return (
          <span
            key={v.id}
            className={cn(
              "group inline-flex items-center gap-1 rounded-full border py-1 pl-3 pr-1.5 text-sm transition-colors",
              active
                ? "border-transparent bg-primary/10 text-primary"
                : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            )}
          >
            <Link href={`/super/orgs${v.query ? `?${v.query}` : ""}`} className="max-w-[10rem] truncate font-medium">
              {v.name}
            </Link>
            <form action={deleteSavedViewAction.bind(null, v.id)} className="flex">
              <button
                type="submit"
                aria-label={`Delete view ${v.name}`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-neutral-400 opacity-60 transition hover:bg-neutral-200 hover:text-neutral-700 group-hover:opacity-100 dark:hover:bg-neutral-700"
              >
                <X className="h-3 w-3" />
              </button>
            </form>
          </span>
        );
      })}

      <div ref={ref} className="relative inline-flex">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={alreadySaved}
          title={alreadySaved ? "This filter is already saved" : "Save the current filters"}
          className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-neutral-300 px-3 py-1 text-sm font-medium text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-800 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
          Save view
        </button>

        {open && (
          <div
            role="dialog"
            className="absolute left-0 top-full z-40 mt-1 w-60 origin-top-left animate-scale-in rounded-lg border border-neutral-200 bg-white p-3 shadow-lg shadow-black/10 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <form ref={formRef} action={action} className="flex flex-col gap-2">
              <label htmlFor="view-name" className="text-xs text-neutral-500 dark:text-neutral-400">
                Name this view
              </label>
              <Input id="view-name" name="name" placeholder="e.g. Pro, gone quiet" required maxLength={40} autoFocus />
              {state.error && <p className="text-xs text-destructive-text">{state.error}</p>}
              <Button type="submit" size="sm">
                Save
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
