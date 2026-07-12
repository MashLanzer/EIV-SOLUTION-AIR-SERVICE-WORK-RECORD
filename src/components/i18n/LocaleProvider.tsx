"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n";

type LocaleContextValue = { locale: Locale; dict: Dictionary };

const LocaleContext = createContext<LocaleContextValue | null>(null);

// Seeded once in the root layout from the server-resolved locale, so client
// components translate with the same dictionary the server used (no flash, no
// second copy bundled — only the active dictionary rides in the RSC payload).
export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, dict }}>
      {children}
    </LocaleContext.Provider>
  );
}

// The dictionary in a client component: `const t = useT(); t.settings.title`.
export function useT(): Dictionary {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useT must be used within a LocaleProvider");
  return ctx.dict;
}

export function useLocale(): Locale {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx.locale;
}
