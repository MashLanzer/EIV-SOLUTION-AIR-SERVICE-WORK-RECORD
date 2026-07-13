"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, FilePlus2, FolderKanban, Images, Plus } from "lucide-react";

import { ActivityBell } from "@/components/activity/ActivityBell";
import { AppTabBar } from "@/components/layout/AppTabBar";
import { HeaderAccountMenu } from "@/components/layout/HeaderAccountMenu";
import { SearchCommand } from "@/components/search/SearchCommand";
import type { CreateItem, MoreItem } from "@/components/layout/AppMenuSheet";
import { BottomTabBar, type TabItem } from "@/components/layout/BottomTabBar";
import { Logo } from "@/components/layout/Logo";
import { useT } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n";

function tabItems(n: Dictionary["nav"]): TabItem[] {
  return [
    { href: "/records", label: n.records, shortLabel: n.records, icon: ClipboardList, exact: true },
    { href: "/records/schedule", label: n.schedule, shortLabel: n.schedule, icon: CalendarDays, exact: false },
    { href: "/records/projects", label: n.projects, shortLabel: n.projects, icon: FolderKanban, exact: false },
    { href: "/records/new", label: n.newRecord, shortLabel: n.newShort, icon: Plus, exact: true },
  ];
}

// Native app bar (APK): three real destination tabs + the center menu button.
// Settings and Sign out live in the menu sheet's account section.
function appTabItems(n: Dictionary["nav"]): TabItem[] {
  return [
    { href: "/records", label: n.records, shortLabel: n.records, icon: ClipboardList, exact: true },
    { href: "/records/schedule", label: n.schedule, shortLabel: n.schedule, icon: CalendarDays, exact: false },
    { href: "/records/projects", label: n.projects, shortLabel: n.projects, icon: FolderKanban, exact: false },
    { href: "/records/photos", label: n.photos, shortLabel: n.photos, icon: Images, exact: false },
  ];
}

// Workers reach everything else from the four tabs; the "More" sheet is just
// their account header (→ Settings) and Sign out.
const MORE_ITEMS: MoreItem[] = [];

// A record is "focused work" - creating or editing one already has its own
// fixed Save/Cancel bar (WorkRecordForm), so the persistent tab bar steps
// aside rather than stacking a second fixed bar at the bottom of the screen.
function isFocusedRecordFlow(pathname: string) {
  return pathname === "/records/new" || /^\/records\/[^/]+\/edit$/.test(pathname);
}

export function WorkerNav({
  name,
  returnedCount = 0,
  latestActivityAt = null,
}: {
  name: string;
  returnedCount?: number;
  latestActivityAt?: number | null;
}) {
  const pathname = usePathname();
  const t = useT();
  const items = tabItems(t.nav).map((item) =>
    item.href === "/records" ? { ...item, badge: returnedCount } : item
  );
  const appTabs = appTabItems(t.nav).map((item) =>
    item.href === "/records" ? { ...item, badge: returnedCount } : item
  );
  const createItems: CreateItem[] = [
    { href: "/records/new", label: t.nav.newRecord, icon: FilePlus2 },
  ];
  const focused = isFocusedRecordFlow(pathname);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 px-4 backdrop-blur native:h-auto native:min-h-14 native:pt-[env(safe-area-inset-top)]">
        <Link href="/records">
          <Logo />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <SearchCommand />
          <ActivityBell href="/records/activity" latestActivityAt={latestActivityAt} />
          <HeaderAccountMenu
            name={name}
            profileHref="/records/profile"
            settingsHref="/records/settings"
          />
        </div>
      </header>

      <BottomTabBar items={items} pathname={pathname} hidden={focused} />
      {!focused && (
        <AppTabBar
          items={appTabs}
          pathname={pathname}
          createItems={createItems}
          moreItems={MORE_ITEMS}
        />
      )}
    </>
  );
}
