"use client";

import { useState, useTransition } from "react";
import { Pin, PinOff } from "lucide-react";

import { togglePinnedProjectAction } from "@/actions/pins";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// Pin / unpin a project to the worker's home strip. Optimistic: flips
// immediately, reverts if the server rejects.
export function PinButton({
  projectId,
  initialPinned,
}: {
  projectId: string;
  initialPinned: boolean;
}) {
  const t = useT().records;
  const [pinned, setPinned] = useState(initialPinned);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !pinned;
    setPinned(next);
    startTransition(async () => {
      const result = await togglePinnedProjectAction(projectId);
      if (result === null) setPinned(!next); // rejected — revert
      else setPinned(result);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={pinned}
      aria-label={pinned ? t.unpin : t.pin}
      title={pinned ? t.unpin : t.pin}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-60",
        pinned
          ? "border-neutral-300 bg-neutral-100 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          : "border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-800 dark:border-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
      )}
    >
      {pinned ? <Pin className="h-4 w-4 fill-current" /> : <PinOff className="h-4 w-4" />}
    </button>
  );
}
