"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  ListChecks,
  Users,
  Users2,
  Contact,
  BarChart3,
  FolderKanban,
  FolderPlus,
  Images,
  UserPlus,
} from "lucide-react";

import { ActivityBell } from "@/components/activity/ActivityBell";
import { AppTabBar } from "@/components/layout/AppTabBar";
import type { CreateItem, MoreItem } from "@/components/layout/AppMenuSheet";
import { BottomTabBar, isTabActive, type TabItem } from "@/components/layout/BottomTabBar";
import { HeaderAccountMenu } from "@/components/layout/HeaderAccountMenu";
import { Logo } from "@/components/layout/Logo";
import { SearchCommand } from "@/components/search/SearchCommand";
import { useT } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function navItems(n: Dictionary["nav"]): TabItem[] {
  return [
  { href: "/admin", label: n.dashboard, shortLabel: n.home, icon: LayoutDashboard, exact: true },
  { href: "/admin/schedule", label: n.schedule, shortLabel: n.schedule, icon: CalendarDays, exact: false },
  { href: "/admin/projects", label: n.projects, shortLabel: n.projects, icon: FolderKanban, exact: false },
  { href: "/admin/photos", label: n.photos, shortLabel: n.photos, icon: Images, exact: false },
  { href: "/admin/records", label: n.records, shortLabel: n.records, icon: ClipboardList, exact: false },
  { href: "/admin/customers", label: n.customers, shortLabel: n.customers, icon: Contact, exact: false },
  { href: "/admin/reports", label: n.payReport, shortLabel: n.pay, icon: BarChart3, exact: false },
  { href: "/admin/workers", label: n.workers, shortLabel: n.workers, icon: Users, exact: false },
  ];
}

// Native app bar (APK): four real destination tabs. Everything else (create
// actions, secondary nav, settings, sign out) lives in the center menu sheet.
function appTabItems(n: Dictionary["nav"]): TabItem[] {
  return [
  { href: "/admin", label: n.dashboard, shortLabel: n.home, icon: LayoutDashboard, exact: true },
  { href: "/admin/projects", label: n.projects, shortLabel: n.projects, icon: FolderKanban, exact: false },
  { href: "/admin/photos", label: n.photos, shortLabel: n.photos, icon: Images, exact: false },
  { href: "/admin/records", label: n.records, shortLabel: n.records, icon: ClipboardList, exact: false },
  ];
}

function createItems(n: Dictionary["nav"]): CreateItem[] {
  return [
  { href: "/admin/projects/new", label: n.newProject, icon: FolderPlus },
  { href: "/admin/workers/new", label: n.newWorker, icon: UserPlus },
  { href: "/admin/teams/new", label: n.newTeam, icon: Users2 },
  ];
}

// Everything that doesn't fit in the four native tabs, shown in the "More"
// section of the menu sheet. Records is now a tab; Settings is reached from
// the sheet's account header.
function moreItems(n: Dictionary["nav"]): MoreItem[] {
  return [
  { href: "/admin/schedule", label: n.schedule, icon: CalendarDays },
  { href: "/admin/customers", label: n.customers, icon: Contact },
  { href: "/admin/reports", label: n.payReport, icon: BarChart3 },
  { href: "/admin/workers", label: n.workers, icon: Users },
  { href: "/admin/checklists", label: n.checklistTemplates, icon: ListChecks },
  ];
}

function NavLinks({ items, pathname }: { items: TabItem[]; pathname: string }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = isTabActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-neutral-100 dark:bg-neutral-800 text-primary"
                : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-white">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar({
  name,
  pendingReviewCount = 0,
  latestActivityAt = null,
}: {
  name: string;
  pendingReviewCount?: number;
  latestActivityAt?: number | null;
}) {
  const pathname = usePathname();
  const t = useT();
  const items = navItems(t.nav).map((item) =>
    item.href === "/admin/records" ? { ...item, badge: pendingReviewCount } : item
  );
  // Records is a native tab, so the review badge rides that tab.
  const appTabs = appTabItems(t.nav).map((item) =>
    item.href === "/admin/records" ? { ...item, badge: pendingReviewCount } : item
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sm:flex">
        <div className="flex h-16 items-center border-b border-neutral-200 dark:border-neutral-800 px-4">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks items={items} pathname={pathname} />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 dark:border-neutral-800 p-3">
          <span className="truncate text-sm text-neutral-500 dark:text-neutral-400">{name}</span>
          <div className="flex items-center gap-2">
            <SearchCommand />
            <ActivityBell href="/admin/activity" latestActivityAt={latestActivityAt} />
            <HeaderAccountMenu
              name={name}
              profileHref="/admin/profile"
              settingsHref="/admin/settings"
            />
          </div>
        </div>
      </aside>

      {/* Mobile top bar - just branding + settings now that navigation
          lives in the bottom tab bar instead of a hamburger drawer. */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 px-4 backdrop-blur sm:hidden native:h-auto native:min-h-14 native:pt-[env(safe-area-inset-top)]">
        <Logo />
        <div className="flex items-center gap-2">
          <SearchCommand />
          <ActivityBell href="/admin/activity" latestActivityAt={latestActivityAt} />
          <HeaderAccountMenu
            name={name}
            profileHref="/admin/profile"
            settingsHref="/admin/settings"
          />
        </div>
      </header>

      <BottomTabBar items={items} pathname={pathname} />
      <AppTabBar
        items={appTabs}
        pathname={pathname}
        createItems={createItems(t.nav)}
        moreItems={moreItems(t.nav)}
      />
    </>
  );
}
