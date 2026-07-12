"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { BottomSheet } from "@/components/layout/BottomSheet";
import { useT } from "@/components/i18n/LocaleProvider";

export interface CreateItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface MoreItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

// The single sheet opened by the center button in AppTabBar:
//   Create  — the role's "new X" actions (primary, so it leads).
//   More    — secondary navigation (admin only; workers have none).
// Account, Profile and Sign out no longer live here — they moved to the header
// account menu (avatar → Profile / Settings / Sign out), so the account has one
// predictable home on every screen.
export function AppMenuSheet({
  open,
  onClose,
  createItems,
  moreItems,
}: {
  open: boolean;
  onClose: () => void;
  createItems: CreateItem[];
  moreItems: MoreItem[];
}) {
  const n = useT().nav;
  return (
    <BottomSheet open={open} onClose={onClose} label={n.menu}>
      {/* Create */}
      <p className="px-4 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {n.create}
      </p>
      <ul className="flex flex-col px-2 pb-2">
        {createItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100 active:bg-neutral-100 dark:active:bg-neutral-800"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {moreItems.length > 0 && (
        <>
          <div className="mx-4 border-t border-neutral-100 dark:border-neutral-800" />
          <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {n.more}
          </p>
          <ul className="flex flex-col px-2 pb-2">
            {moreItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100 active:bg-neutral-100 dark:active:bg-neutral-800"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-white tabular-nums">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    ) : null}
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Clearance so the floating tab bar (which rides above the sheet while
          open, to keep the × close button visible) doesn't cover this row. */}
      <div aria-hidden="true" className="h-20" />
    </BottomSheet>
  );
}
