"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { useLastSeen } from "@/components/activity/activity-seen";
import { useT } from "@/components/i18n/LocaleProvider";

// Header entry point to the activity feed. Shows an unread dot when the newest
// event (computed server-side, passed as epoch ms) is newer than the last time
// this device opened the feed. `latestActivityAt` is null when there is no
// activity at all.
export function ActivityBell({
  href,
  latestActivityAt,
}: {
  href: string;
  latestActivityAt: number | null;
}) {
  const lastSeen = useLastSeen();
  const unread = latestActivityAt !== null && latestActivityAt > lastSeen;
  const t = useT().activity;

  return (
    <Link
      href={href}
      aria-label={unread ? t.bellNew : t.bell}
      className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-95"
    >
      <Bell className="h-4 w-4" />
      {unread && (
        <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-primary ring-2 ring-white dark:ring-neutral-900" />
        </span>
      )}
    </Link>
  );
}
