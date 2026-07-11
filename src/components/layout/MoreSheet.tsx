"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { BottomSheet } from "@/components/layout/BottomSheet";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { AvatarInitials } from "@/components/ui/avatar-initials";

export interface MoreItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

// The "More" bottom sheet: an account header that jumps to Settings, the
// secondary navigation that doesn't fit in the four tabs, and Sign out. Opened
// by the "More" tab in AppTabBar (replaces the old /more page).
export function MoreSheet({
  open,
  onClose,
  items,
  name,
  roleLabel,
  settingsHref,
}: {
  open: boolean;
  onClose: () => void;
  items: MoreItem[];
  name: string;
  roleLabel: string;
  settingsHref: string;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} label="More" title="More">
      {/* Account header → Settings */}
      <div className="px-2 pb-2">
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

      {items.length > 0 && (
        <>
          <div className="mx-4 border-t border-neutral-100 dark:border-neutral-800" />
          <ul className="flex flex-col px-2 py-2">
            {items.map((item) => {
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

      <div className="mx-4 border-t border-neutral-100 dark:border-neutral-800" />
      <div className="px-2 pt-2">
        <div className="overflow-hidden rounded-xl">
          <LogoutButton />
        </div>
      </div>
    </BottomSheet>
  );
}
