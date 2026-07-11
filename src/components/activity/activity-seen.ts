"use client";

import { useSyncExternalStore } from "react";

// The unread dot is driven entirely on-device: we remember, in localStorage,
// the timestamp the user last opened the activity feed. Anything newer than
// that is "unread". No server read-state, no per-user table - opening the feed
// on this device clears the dot on this device, which is the right mental model
// for a "what's new since I last looked" indicator.
const KEY = "activity-last-seen";

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

function readLastSeen(): number {
  const raw = localStorage.getItem(KEY);
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}

// Epoch ms of the last time the feed was opened on this device (0 if never).
export function useLastSeen(): number {
  return useSyncExternalStore(subscribe, readLastSeen, () => 0);
}

// Call when the feed page mounts: mark everything up to now as seen and fan the
// change out to the bell in the same tab.
export function markActivitySeen() {
  localStorage.setItem(KEY, String(Date.now()));
  emit();
}
