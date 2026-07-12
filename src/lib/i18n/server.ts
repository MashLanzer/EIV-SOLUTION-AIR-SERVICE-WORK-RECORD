import { cookies } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n";

// The active locale for this request, from the NEXT_LOCALE cookie (falls back
// to the default). Server components call this to render in the right language.
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

// The dictionary for this request. `t` reads like `t.settings.title`.
export async function getT(): Promise<Dictionary> {
  return getDictionary(await getLocale());
}
