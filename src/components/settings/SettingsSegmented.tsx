"use client";

import { useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";

import { SettingsCustomRow } from "@/components/settings/SettingsList";
import { cn } from "@/lib/utils";

// A company setting chosen from a few options, shown as a labelled segmented
// control. Optimistic: the selection updates instantly and the server action
// confirms. Backs the week-start and time-format settings.
export function SettingsSegmented<T extends string>({
  icon: Icon,
  label,
  sublabel,
  value,
  options,
  action,
}: {
  icon?: LucideIcon;
  label: string;
  sublabel?: string;
  value: T;
  options: { value: T; label: string }[];
  action: (value: T) => Promise<void>;
}) {
  const [current, setCurrent] = useState<T>(value);
  const [pending, startTransition] = useTransition();

  function pick(next: T) {
    if (next === current) return;
    setCurrent(next);
    startTransition(async () => {
      await action(next);
    });
  }

  return (
    <SettingsCustomRow className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            <Icon className="h-4.5 w-4.5" />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</span>
          {sublabel && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">{sublabel}</span>
          )}
        </div>
      </div>
      <div
        className="grid gap-1 rounded-lg border border-neutral-200 bg-neutral-100/60 p-1 dark:border-neutral-800 dark:bg-neutral-900"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const active = o.value === current;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              disabled={pending}
              aria-pressed={active}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60",
                active
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-neutral-500 dark:text-neutral-400"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </SettingsCustomRow>
  );
}
