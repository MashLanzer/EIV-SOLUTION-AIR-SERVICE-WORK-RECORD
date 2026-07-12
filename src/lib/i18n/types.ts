import type { en } from "@/lib/i18n/dictionaries/en";

// English is the source (declared `as const`), so `typeof en` has string
// *literal* types. Widen every leaf to its base type so translations only have
// to match the shape and keys, not the exact English text.
type DeepWiden<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : { [K in keyof T]: DeepWiden<T[K]> };

// The dictionary shape every language must provide. A missing or renamed key
// fails the build.
export type Dictionary = DeepWiden<typeof en>;
