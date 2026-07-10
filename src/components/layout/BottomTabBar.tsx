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
  // Count shown as a small red badge on the icon (e.g. records pending
  // review, or records returned to the worker). 0/undefined = no badge.
  badge?: number;
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
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-lg shadow-[0_-1px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-1px_16px_rgba(0,0,0,0.35)] pb-[env(safe-area-inset-bottom)] sm:hidden"
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
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors duration-200",
              isActive ? "text-primary" : "text-neutral-500 dark:text-neutral-400"
            )}
          >
            <span className="relative">
              <Icon
                className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-110")}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {item.badge ? (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </span>
            <span className="truncate">{item.shortLabel}</span>
            <span
              aria-hidden="true"
              className={cn(
                "absolute bottom-0.5 h-[3px] w-4 origin-center rounded-full bg-primary transition-transform duration-200",
                isActive ? "scale-x-100" : "scale-x-0"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
