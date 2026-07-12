"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";

import { SettingsRow } from "@/components/settings/SettingsList";
import { useT, useLocale } from "@/components/i18n/LocaleProvider";
import { LOCALES, LOCALE_COOKIE, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

// A year-long cookie, per browser/device. Kept out of the component so the
// document.cookie write isn't treated as reactive state.
function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

// The display-language picker. Writes the locale cookie (per browser/device,
// like theme) and refreshes so server components re-render in the new
// language. A one-year cookie keeps the choice.
export function LanguageSetting() {
  const t = useT();
  const active = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function pick(locale: Locale) {
    if (locale === active) return;
    writeLocaleCookie(locale);
    startTransition(() => router.refresh());
  }

  return (
    <SettingsRow
      icon={Languages}
      label={t.appearance.language}
      sublabel={t.appearance.languageHint}
      trailing={
        <div
          role="radiogroup"
          aria-label={t.appearance.language}
          className="flex rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900 p-0.5"
        >
          {LOCALES.map((locale) => {
            const on = active === locale;
            return (
              <button
                key={locale}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={pending}
                onClick={() => pick(locale)}
                className={cn(
                  "min-w-11 rounded-md px-2.5 py-1 text-sm font-medium transition-colors disabled:opacity-60",
                  on
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                )}
              >
                {LOCALE_LABELS[locale]}
              </button>
            );
          })}
        </div>
      }
    />
  );
}
