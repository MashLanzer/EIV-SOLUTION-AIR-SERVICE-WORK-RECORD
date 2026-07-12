"use client";

import type { SearchGroupType } from "@/lib/globalSearch";

// On-device memory for the command palette: the last few queries typed and the
// last few results opened, so an empty palette offers useful shortcuts instead
// of a blank hint. Stored per device in localStorage; never leaves the browser.
const Q_KEY = "search-recent-queries";
const I_KEY = "search-recent-items";
const MAX_QUERIES = 5;
const MAX_ITEMS = 6;

export interface RecentItem {
  type: SearchGroupType;
  title: string;
  subtitle?: string;
  href: string;
}

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/availability errors — recents are a nicety, not critical.
  }
}

export function getRecentQueries(): string[] {
  return read<string>(Q_KEY);
}

export function pushRecentQuery(query: string) {
  const q = query.trim();
  if (q.length < 2) return;
  const next = [q, ...getRecentQueries().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(
    0,
    MAX_QUERIES
  );
  write(Q_KEY, next);
}

export function getRecentItems(): RecentItem[] {
  return read<RecentItem>(I_KEY);
}

export function pushRecentItem(item: RecentItem) {
  const next = [item, ...getRecentItems().filter((x) => x.href !== item.href)].slice(0, MAX_ITEMS);
  write(I_KEY, next);
}
