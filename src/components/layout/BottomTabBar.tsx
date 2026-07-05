"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface TabItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  exact: boolean;
}

export function isTabActive(pathname: string, item: TabItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

// A fixed bottom tab bar (icon + short label) reads as a native mobile app
// rather than a shrunk-down desktop sidebar - this is the primary nav on
// phones for both the worker and admin sections, replacing the old
// hamburger + slide-out drawer / lone FAB patterns.
export function BottomTabBar({
  items,
  pathname,
  hidden = false,
}: {
  items: TabItem[];
  pathname: string;
  // Hidden during a focused create/edit flow that already has its own
  // fixed action bar (e.g. the worker's new/edit record form).
  hidden?: boolean;
}) {
  if (hidden) return null;

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      {items.map((item) => {
        const isActive = isTabActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
              isActive ? "text-primary" : "text-neutral-500 dark:text-neutral-400"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
            <span className="truncate">{item.shortLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
