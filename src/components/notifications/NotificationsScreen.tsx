import Link from "next/link";
import type { NotificationCategory } from "@prisma/client";
import { Activity, Bell } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { MarkActivitySeen } from "@/components/activity/MarkActivitySeen";
import { MarkNotificationsRead } from "@/components/notifications/MarkNotificationsRead";
import { NotificationList } from "@/components/notifications/NotificationList";
import { getActivityFeed, type ActivityType } from "@/lib/activity";
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
  activityType,
}: {
  userId: string;
  organizationId: string;
  isAdmin: boolean;
  basePath: string;
  tab: string | undefined;
  // Optional type filter for the Activity tab (records | photos | ...).
  activityType?: string;
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
    <div className="flex flex-col gap-3">
      <PageHeader title={t.notificationsTitle} description={t.notificationsSubtitle} />

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
        <ActivityTab
          organizationId={organizationId}
          userId={userId}
          isAdmin={isAdmin}
          basePath={basePath}
          activityType={activityType}
          t={t}
        />
      ) : (
        <PersistedTab
          userId={userId}
          category={CATEGORY[active]}
          basePath={basePath}
          activeTab={active}
          notifType={activityType}
          t={t}
        />
      )}
    </div>
  );
}

// Type-filter groups for a persisted-notifications tab, mapping each chip to its
// notification types. Only groups with events show a chip (like the Activity tab).
const NOTIF_GROUPS: Record<string, string[]> = {
  records: ["record_submitted", "record_resubmitted", "record_approved", "record_returned"],
  schedule: ["job_scheduled", "job_reassigned", "job_rescheduled", "job_reminder", "job_series", "time_off_added"],
  photos: ["photo_comment"],
  system: ["system"],
};
const NOTIF_GROUP_KEYS = Object.keys(NOTIF_GROUPS);

async function PersistedTab({
  userId,
  category,
  basePath,
  activeTab,
  notifType,
  t,
}: {
  userId: string;
  category: NotificationCategory;
  basePath: string;
  activeTab: string;
  notifType?: string;
  t: Awaited<ReturnType<typeof getT>>["activity"];
}) {
  const items = await getNotificationFeed(userId, { category });
  const active = NOTIF_GROUP_KEYS.includes(notifType ?? "") ? notifType! : null;

  const groupLabel: Record<string, string> = {
    records: t.filterRecords,
    schedule: t.filterSchedule,
    photos: t.filterPhotos,
    system: t.filterSystem,
  };
  // Which groups have any events — drives the chip row (hidden when there's
  // nothing to filter, i.e. 0–1 group present).
  const groupCounts = NOTIF_GROUP_KEYS.map((key) => ({
    key,
    label: groupLabel[key],
    count: items.filter((n) => NOTIF_GROUPS[key].includes(n.type)).length,
  })).filter((g) => g.count > 0);

  const shown = active ? items.filter((n) => NOTIF_GROUPS[active].includes(n.type)) : items;
  const chipHref = (key: string | null) =>
    key ? `${basePath}?tab=${activeTab}&type=${key}` : `${basePath}?tab=${activeTab}`;

  return (
    <>
      {/* Opening the tab marks the whole category read regardless of filter. */}
      <MarkNotificationsRead category={category} />
      {groupCounts.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip href={chipHref(null)} active={active === null}>
            {t.filterAllTypes}
          </FilterChip>
          {groupCounts.map((g) => (
            <FilterChip key={g.key} href={chipHref(g.key)} active={active === g.key} count={g.count}>
              {g.label}
            </FilterChip>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <EmptyState icon={Bell} title={t.emptyTitle} description={t.emptyDesc} />
      ) : (
        <NotificationList items={shown} />
      )}
    </>
  );
}

// Type-filter groups for the Activity tab, mapping each chip to its event
// types. Only groups that actually have events show a chip.
const ACTIVITY_GROUPS: Record<string, ActivityType[]> = {
  records: ["record_submitted", "record_approved", "record_returned"],
  photos: ["photo_added", "comment_added"],
  projects: ["project_created"],
  people: ["worker_added", "customer_added", "team_added"],
};
const ACTIVITY_GROUP_KEYS = Object.keys(ACTIVITY_GROUPS);

async function ActivityTab({
  organizationId,
  userId,
  isAdmin,
  basePath,
  activityType,
  t,
}: {
  organizationId: string;
  userId: string;
  isAdmin: boolean;
  basePath: string;
  activityType?: string;
  t: Awaited<ReturnType<typeof getT>>["activity"];
}) {
  const events = await getActivityFeed({ organizationId, userId, isAdmin });
  const active = ACTIVITY_GROUP_KEYS.includes(activityType ?? "") ? activityType! : null;

  const groupLabel: Record<string, string> = {
    records: t.filterRecords,
    photos: t.filterPhotos,
    projects: t.filterProjects,
    people: t.filterPeople,
  };
  // Which groups have any events — drives the chip row (hidden when there's
  // nothing to filter, i.e. 0–1 group present).
  const groupCounts = ACTIVITY_GROUP_KEYS.map((key) => ({
    key,
    label: groupLabel[key],
    count: events.filter((e) => ACTIVITY_GROUPS[key].includes(e.type)).length,
  })).filter((g) => g.count > 0);

  const shown = active ? events.filter((e) => ACTIVITY_GROUPS[active].includes(e.type)) : events;
  const chipHref = (key: string | null) =>
    key ? `${basePath}?tab=activity&type=${key}` : `${basePath}?tab=activity`;

  return (
    <>
      <MarkActivitySeen />
      {groupCounts.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip href={chipHref(null)} active={active === null}>
            {t.filterAllTypes}
          </FilterChip>
          {groupCounts.map((g) => (
            <FilterChip key={g.key} href={chipHref(g.key)} active={active === g.key} count={g.count}>
              {g.label}
            </FilterChip>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <EmptyState icon={Activity} title={t.nothingYet} description={isAdmin ? t.adminNothingDesc : t.nothingYetDesc} />
      ) : (
        <ActivityFeed events={shown} />
      )}
    </>
  );
}
