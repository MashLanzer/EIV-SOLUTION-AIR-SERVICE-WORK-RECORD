"use client";

import { useState, useSyncExternalStore } from "react";
import { Megaphone, X } from "lucide-react";

// Reads the per-browser "dismissed" flag without a setState-in-effect: the
// server snapshot is always false (banner shows), the client snapshot reads
// localStorage. Keyed by announcement id so a new one reappears.
function useDismissedFlag(key: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      return () => window.removeEventListener("storage", cb);
    },
    () => localStorage.getItem(key) === "1",
    () => false
  );
}

export function AnnouncementBanner({ id, message }: { id: string; message: string }) {
  const storageKey = `announce_dismissed_${id}`;
  const persisted = useDismissedFlag(storageKey);
  const [clicked, setClicked] = useState(false);

  if (persisted || clicked) return null;

  return (
    <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-900 px-4 py-2 text-sm text-white dark:border-neutral-700 dark:bg-neutral-100 dark:text-neutral-900">
      <Megaphone className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          localStorage.setItem(storageKey, "1");
          setClicked(true);
        }}
        className="shrink-0 rounded p-1 hover:bg-white/15 dark:hover:bg-neutral-900/15"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
