"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { BottomSheet } from "@/components/layout/BottomSheet";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { AvatarInitials } from "@/components/ui/avatar-initials";

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

// The single sheet opened by the center button in AppTabBar. It merges what
// used to be two separate surfaces (the create FAB sheet and the "More" tab):
//   Create  — the role's "new X" actions (primary, so it leads).
//   More    — the account header (→ Settings), secondary navigation, Sign out.
// One sheet instead of two, which frees the fourth tab slot for a real screen.
export function AppMenuSheet({
  open,
  onClose,
  createItems,
  moreItems,
  name,
  roleLabel,
  settingsHref,
}: {
  open: boolean;
  onClose: () => void;
  createItems: CreateItem[];
  moreItems: MoreItem[];
  name: string;
  roleLabel: string;
  settingsHref: string;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} label="Menu">
      {/* Create */}
      <p className="px-4 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Create
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

      <div className="mx-4 border-t border-neutral-100 dark:border-neutral-800" />

      {/* More */}
      <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        More
      </p>
      <div className="px-2">
        <Link
          href={settingsHref}
          onClick={onClose}
          className="flex items-center gap-3 rounded-xl px-3 py-3 active:bg-neutral-100 dark:active:bg-neutral-800"
        >
          <AvatarInitials name={name || roleLabel} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {name || "Your account"}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {roleLabel} · Account &amp; settings
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
        </Link>
      </div>

      {moreItems.length > 0 && (
        <ul className="flex flex-col px-2">
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
      )}

      <div className="mx-4 mt-2 border-t border-neutral-100 dark:border-neutral-800" />
      <div className="px-2 pt-2">
        <div className="overflow-hidden rounded-xl">
          <LogoutButton />
        </div>
      </div>
    </BottomSheet>
  );
}
