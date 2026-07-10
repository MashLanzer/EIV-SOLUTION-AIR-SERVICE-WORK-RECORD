"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, FilePlus2, FolderKanban, Images, MoreHorizontal, Plus } from "lucide-react";

import { AppTabBar } from "@/components/layout/AppTabBar";
import { BottomTabBar, type TabItem } from "@/components/layout/BottomTabBar";
import type { CreateItem } from "@/components/layout/CreateSheet";
import { Logo } from "@/components/layout/Logo";
import { SettingsLink } from "@/components/layout/SettingsLink";

const TAB_ITEMS: TabItem[] = [
  { href: "/records", label: "Records", shortLabel: "Records", icon: ClipboardList, exact: true },
  { href: "/records/projects", label: "Projects", shortLabel: "Projects", icon: FolderKanban, exact: false },
  { href: "/records/new", label: "New Record", shortLabel: "New", icon: Plus, exact: true },
];

// Native app bar (APK): four tabs + center FAB.
const APP_TABS: TabItem[] = [
  { href: "/records", label: "Records", shortLabel: "Records", icon: ClipboardList, exact: true },
  { href: "/records/projects", label: "Projects", shortLabel: "Projects", icon: FolderKanban, exact: false },
  { href: "/records/photos", label: "Photos", shortLabel: "Photos", icon: Images, exact: false },
  { href: "/records/more", label: "More", shortLabel: "More", icon: MoreHorizontal, exact: false },
];

const CREATE_ITEMS: CreateItem[] = [
  { href: "/records/new", label: "New record", icon: FilePlus2 },
];

// A record is "focused work" - creating or editing one already has its own
// fixed Save/Cancel bar (WorkRecordForm), so the persistent tab bar steps
// aside rather than stacking a second fixed bar at the bottom of the screen.
function isFocusedRecordFlow(pathname: string) {
  return pathname === "/records/new" || /^\/records\/[^/]+\/edit$/.test(pathname);
}

export function WorkerNav({
  name,
  returnedCount = 0,
}: {
  name: string;
  returnedCount?: number;
}) {
  const pathname = usePathname();
  const items = TAB_ITEMS.map((item) =>
    item.href === "/records" ? { ...item, badge: returnedCount } : item
  );
  const appTabs = APP_TABS.map((item) =>
    item.href === "/records" ? { ...item, badge: returnedCount } : item
  );
  const focused = isFocusedRecordFlow(pathname);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 px-4 backdrop-blur native:h-auto native:min-h-14 native:pt-[env(safe-area-inset-top)]">
        <Link href="/records">
          <Logo />
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-neutral-500 dark:text-neutral-400 sm:inline">{name}</span>
          <SettingsLink href="/records/settings" />
        </div>
      </header>

      <BottomTabBar items={items} pathname={pathname} hidden={focused} />
      {!focused && (
        <AppTabBar items={appTabs} pathname={pathname} createItems={CREATE_ITEMS} />
      )}
    </>
  );
}
