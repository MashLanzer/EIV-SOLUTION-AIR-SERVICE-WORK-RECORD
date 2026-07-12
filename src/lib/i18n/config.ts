// App languages. English is the source dictionary and the default, so nothing
// changes for anyone until they pick Spanish. The choice is stored in a cookie
// (per browser/device) so server components can read it and render the right
// language with no flash.
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "es";
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
};
