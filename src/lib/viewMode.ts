"use client";

import { useSyncExternalStore } from "react";

// Per-list "list vs grid" view preference, stored per device (like theme). Keyed
// by a list name so different lists keep independent preferences. List is the
// default, so grid is the only value written.

export type ViewMode = "list" | "grid";

export function normalizeViewMode(value: string | null | undefined): ViewMode {
  return value === "grid" ? "grid" : "list";
}

function storageKey(name: string): string {
  return `view-mode:${name}`;
}

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function setViewMode(name: string, mode: ViewMode) {
  if (mode === "grid") localStorage.setItem(storageKey(name), "grid");
  else localStorage.removeItem(storageKey(name));
  emit();
}

export function useViewMode(name: string): ViewMode {
  return useSyncExternalStore(
    subscribe,
    () => normalizeViewMode(localStorage.getItem(storageKey(name))),
    () => "list"
  );
}
