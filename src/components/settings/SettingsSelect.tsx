"use client";

import { useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";

import { SettingsCustomRow } from "@/components/settings/SettingsList";
import { Select } from "@/components/ui/select";

// A company setting chosen from a longer list, shown as a labelled dropdown
// (segmented control doesn't scale past a few options). Optimistic: the value
// updates instantly and the server action confirms. Backs the time-zone setting.
export function SettingsSelect({
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
  value: string;
  options: { value: string; label: string }[];
  action: (value: string) => Promise<void>;
}) {
  const [current, setCurrent] = useState(value);
  const [pending, startTransition] = useTransition();

  function pick(next: string) {
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
      <Select
        value={current}
        onChange={(e) => pick(e.target.value)}
        disabled={pending}
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </SettingsCustomRow>
  );
}
