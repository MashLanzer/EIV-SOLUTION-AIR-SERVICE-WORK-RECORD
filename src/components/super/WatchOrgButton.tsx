"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, FlagOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { watchOrgAction, unwatchOrgAction } from "@/actions/orgWatch";

// Toggle the platform "watch" flag on a company. When not watched, the button
// opens a small note field before flagging (so the owner records why); when
// watched, it's a filled control that clears the flag on press.
export function WatchOrgButton({
  orgId,
  watched,
  note,
}: {
  orgId: string;
  watched: boolean;
  note?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  if (watched) {
    return (
      <form action={unwatchOrgAction.bind(null, orgId)}>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          title={note ? `Watching — ${note}` : "Watching"}
          className="border-warning-text/40 bg-warning-soft text-warning-text hover:bg-warning-soft/70"
        >
          <Flag className="h-4 w-4 fill-current" />
          Watching
        </Button>
      </form>
    );
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
        <FlagOff className="h-4 w-4" />
        Watch
      </Button>

      {open && (
        <div
          role="dialog"
          className="absolute right-0 top-full z-40 mt-1 w-64 origin-top-right animate-scale-in rounded-lg border border-neutral-200 bg-white p-3 shadow-lg shadow-black/10 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <form action={watchOrgAction.bind(null, orgId)} className="flex flex-col gap-2">
            <label htmlFor="watch-note" className="text-xs text-neutral-500 dark:text-neutral-400">
              Why watch this company? (optional)
            </label>
            <textarea
              id="watch-note"
              name="note"
              rows={2}
              maxLength={300}
              placeholder="e.g. churn risk, follow up on onboarding"
              className="w-full resize-y rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
            />
            <Button type="submit" size="sm" onClick={() => setOpen(false)}>
              <Flag className="h-4 w-4" />
              Flag to watch
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
