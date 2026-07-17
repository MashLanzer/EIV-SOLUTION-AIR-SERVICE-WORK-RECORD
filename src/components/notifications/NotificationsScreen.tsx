import Link from "next/link";
import type { NotificationCategory } from "@prisma/client";
import { Activity, Bell } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { MarkActivitySeen } from "@/components/activity/MarkActivitySeen";
import { MarkNotificationsRead } from "@/components/notifications/MarkNotificationsRead";
import { NotificationList } from "@/components/notifications/NotificationList";
import { getActivityFeed } from "@/lib/activity";
import {
  getNotificationFeed,
  getUnreadByCategory,
} from "@/lib/inappNotify";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

// The four bell tabs. "activity" is the existing derived, device-seen feed;
// the other three read the persisted Notification table and mark-read on open.
type TabKey = "personal" | "company" | "system" | "activity";
const CATEGORY: Record<Exclude<TabKey, "activity">, NotificationCategory> = {
  personal: "PERSONAL",
  company: "COMPANY",
  system: "SYSTEM",
};

// Workers only receive Personal + the ambient Activity feed; Company and System
// are office-only concepts, so their tabs show only for admins.
function tabsFor(isAdmin: boolean): TabKey[] {
  return isAdmin ? ["personal", "company", "system", "activity"] : ["personal", "activity"];
}

// The whole bell screen for both apps. `basePath` is the route the tab links
// point at (/admin/activity or /records/activity); `tab` is the active one.
export async function NotificationsScreen({
  userId,
  organizationId,
  isAdmin,
  basePath,
  tab,
}: {
  userId: string;
  organizationId: string;
  isAdmin: boolean;
  basePath: string;
  tab: string | undefined;
}) {
  const t = (await getT()).activity;
  const tabs = tabsFor(isAdmin);
  const active: TabKey = (tabs as string[]).includes(tab ?? "")
    ? (tab as TabKey)
    : "personal";
  const unread = await getUnreadByCategory(userId);
  const tabLabel: Record<TabKey, string> = {
    personal: t.tabPersonal,
    company: t.tabCompany,
    system: t.tabSystem,
    activity: t.tabActivity,
  };
  const tabUnread: Record<TabKey, number> = {
    personal: unread.PERSONAL,
    company: unread.COMPANY,
    system: unread.SYSTEM,
    activity: 0,
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
          <Bell className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {t.notificationsTitle}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.notificationsSubtitle}</p>
        </div>
      </div>

      {/* Tabs — segmented control (matches the profile screen for visual
          consistency across the app). */}
      <nav
        aria-label={t.notificationsTitle}
        className="flex rounded-xl border border-neutral-200 bg-neutral-100 p-1 dark:border-neutral-800 dark:bg-neutral-900"
      >
        {tabs.map((key) => {
          const isActive = key === active;
          const n = tabUnread[key];
          return (
            <Link
              key={key}
              href={key === "personal" ? basePath : `${basePath}?tab=${key}`}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              )}
            >
              <span className="truncate">{tabLabel[key]}</span>
              {n > 0 && (
                <span className="min-w-[1.1rem] shrink-0 rounded-full bg-primary px-1 text-center text-[10px] font-semibold tabular-nums text-primary-foreground">
                  {n > 99 ? "99+" : n}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {active === "activity" ? (
        <ActivityTab organizationId={organizationId} userId={userId} isAdmin={isAdmin} t={t} />
      ) : (
        <PersistedTab userId={userId} category={CATEGORY[active]} t={t} />
      )}
    </div>
  );
}

async function PersistedTab({
  userId,
  category,
  t,
}: {
  userId: string;
  category: NotificationCategory;
  t: Awaited<ReturnType<typeof getT>>["activity"];
}) {
  const items = await getNotificationFeed(userId, { category });
  return (
    <>
      <MarkNotificationsRead category={category} />
      {items.length === 0 ? (
        <EmptyState icon={Bell} title={t.emptyTitle} description={t.emptyDesc} />
      ) : (
        <NotificationList items={items} />
      )}
    </>
  );
}

async function ActivityTab({
  organizationId,
  userId,
  isAdmin,
  t,
}: {
  organizationId: string;
  userId: string;
  isAdmin: boolean;
  t: Awaited<ReturnType<typeof getT>>["activity"];
}) {
  const events = await getActivityFeed({ organizationId, userId, isAdmin });
  return (
    <>
      <MarkActivitySeen />
      {events.length === 0 ? (
        <EmptyState icon={Activity} title={t.nothingYet} description={isAdmin ? t.adminNothingDesc : t.nothingYetDesc} />
      ) : (
        <ActivityFeed events={events} />
      )}
    </>
  );
}
