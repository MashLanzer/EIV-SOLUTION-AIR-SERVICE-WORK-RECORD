"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { useLastSeen } from "@/components/activity/activity-seen";
import { useT } from "@/components/i18n/LocaleProvider";

// Header entry point to the notifications bell. Its badge is primarily the
// count of unread persisted notifications (Personal / Company / System). When
// there are none, it falls back to the ambient "new activity" ping dot — the
// derived Activity feed being newer (server-side epoch ms) than the last time
// this device opened it. `latestActivityAt` is null when there's no activity.
export function ActivityBell({
  href,
  latestActivityAt,
  unreadCount = 0,
}: {
  href: string;
  latestActivityAt: number | null;
  unreadCount?: number;
}) {
  const lastSeen = useLastSeen();
  const activityNew = latestActivityAt !== null && latestActivityAt > lastSeen;
  const hasCount = unreadCount > 0;
  const t = useT().activity;

  return (
    <Link
      href={href}
      aria-label={hasCount || activityNew ? t.bellNew : t.bell}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-95"
    >
      <Bell className="h-4 w-4" />
      {hasCount ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground ring-2 ring-white dark:ring-neutral-900">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : (
        activityNew && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary ring-2 ring-white dark:ring-neutral-900" />
          </span>
        )
      )}
    </Link>
  );
}
