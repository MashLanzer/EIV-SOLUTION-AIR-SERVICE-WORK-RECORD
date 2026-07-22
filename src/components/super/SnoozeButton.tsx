"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Clock } from "lucide-react";

import { snoozeOrgReminderAction } from "@/actions/orgReminders";

const OPTIONS: { days: number; label: string }[] = [
  { days: 1, label: "1 day" },
  { days: 3, label: "3 days" },
  { days: 7, label: "1 week" },
];

// Push a follow-up's due date out. A small dropdown (1 day / 3 days / 1 week)
// used on the Home due-list and the company reminders panel.
export function SnoozeButton({ reminderId, compact = false }: { reminderId: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
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

  function snooze(days: number) {
    setOpen(false);
    startTransition(async () => {
      await snoozeOrgReminderAction(reminderId, days);
    });
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      >
        <Clock className="h-3.5 w-3.5" />
        {compact ? "Snooze" : pending ? "Snoozing…" : "Snooze"}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-1 w-32 origin-top-right animate-scale-in rounded-lg border border-neutral-200 bg-white p-1 shadow-lg shadow-black/10 dark:border-neutral-800 dark:bg-neutral-900"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.days}
              type="button"
              role="menuitem"
              onClick={() => snooze(o.days)}
              className="flex w-full items-center rounded-md px-2.5 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
