"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";

import { SettingsRow } from "@/components/settings/SettingsList";
import { useT } from "@/components/i18n/LocaleProvider";
import { useUse24Hour } from "@/components/i18n/TimeFormatProvider";
import { TIME_FORMAT_COOKIE } from "@/lib/timeFormatCookie";
import { cn } from "@/lib/utils";

// A year-long cookie, per browser/device (like the language and theme prefs).
// Kept out of the component so the document.cookie write isn't reactive state.
function writeTimeFormatCookie(value: "12" | "24") {
  document.cookie = `${TIME_FORMAT_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}

const OPTIONS: { value: "12" | "24"; label: string }[] = [
  { value: "12", label: "12h" },
  { value: "24", label: "24h" },
];

// The 12/24-hour time-format picker. Writes the device cookie and refreshes so
// getUse24Hour re-resolves and every server- and client-rendered time updates.
// The current value comes from the shared TimeFormatProvider context, so it's
// SSR-safe (no hydration mismatch). Overrides the company setting on this
// device only.
export function TimeFormatSetting() {
  const t = useT();
  const use24 = useUse24Hour();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(value: "12" | "24") {
    if ((value === "24") === use24) return;
    writeTimeFormatCookie(value);
    startTransition(() => router.refresh());
  }

  return (
    <SettingsRow
      icon={Clock}
      label={t.appearance.timeFormat}
      sublabel={t.appearance.timeFormatHint}
      trailing={
        <div
          role="radiogroup"
          aria-label={t.appearance.timeFormat}
          className="flex rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900 p-0.5"
        >
          {OPTIONS.map((opt) => {
            const on = (opt.value === "24") === use24;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={pending}
                onClick={() => pick(opt.value)}
                className={cn(
                  "min-w-11 rounded-md px-2.5 py-1 text-sm font-medium tabular-nums transition-colors disabled:opacity-60",
                  on
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      }
    />
  );
}
