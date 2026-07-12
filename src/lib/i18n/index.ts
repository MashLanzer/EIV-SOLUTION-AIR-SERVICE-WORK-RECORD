import { en } from "@/lib/i18n/dictionaries/en";
import { es } from "@/lib/i18n/dictionaries/es";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/types";

export type { Dictionary } from "@/lib/i18n/types";

const dictionaries: Record<Locale, Dictionary> = {
  en: en as Dictionary,
  es,
};

// Pick the dictionary for a locale. Both are plain data, safe to import on the
// server or client; only the active one is serialized into the RSC payload
// because client components receive it through LocaleProvider, not by import.
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
