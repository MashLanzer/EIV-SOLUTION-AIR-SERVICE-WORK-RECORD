"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";

import { isTabActive, type TabItem } from "@/components/layout/BottomTabBar";
import { CreateSheet, type CreateItem } from "@/components/layout/CreateSheet";
import { MoreSheet, type MoreItem } from "@/components/layout/MoreSheet";
import { cn } from "@/lib/utils";

// Native (APK-only) bottom navigation: three destination tabs + a "More" tab
// that opens a bottom sheet, with a raised center FAB that opens a role-aware
// "create" sheet. Shown only inside the Capacitor WebView (html[data-native]);
// the browser keeps the plain BottomTabBar.
export function AppTabBar({
  items,
  pathname,
  createItems,
  moreItems,
  name,
  roleLabel,
  settingsHref,
}: {
  // Exactly four tabs; the last is the "More" tab and opens the sheet instead
  // of navigating.
  items: TabItem[];
  pathname: string;
  createItems: CreateItem[];
  moreItems: MoreItem[];
  name: string;
  roleLabel: string;
  settingsHref: string;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const left = items.slice(0, 2);
  const photos = items[2];
  const more = items[3];

  return (
    <>
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 hidden native:flex sm:hidden items-stretch border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-lg shadow-[0_-1px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_-1px_16px_rgba(0,0,0,0.4)] pb-[env(safe-area-inset-bottom)]"
      >
        {left.map((item) => (
          <Tab key={item.href} item={item} active={isTabActive(pathname, item)} />
        ))}

        {/* Center FAB */}
        <div className="flex w-16 shrink-0 items-start justify-center">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            aria-label="Create"
            className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/20 active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {photos && <Tab item={photos} active={isTabActive(pathname, photos)} />}
        {more && (
          <MoreTab
            item={more}
            active={moreOpen}
            onClick={() => setMoreOpen(true)}
          />
        )}
      </nav>

      <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} items={createItems} />
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        items={moreItems}
        name={name}
        roleLabel={roleLabel}
        settingsHref={settingsHref}
      />
    </>
  );
}

function TabInner({ item, active }: { item: TabItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <>
      <span className="relative">
        <Icon
          className={cn("h-5 w-5 transition-transform duration-200", active && "scale-110")}
          strokeWidth={active ? 2.5 : 2}
        />
        {item.badge ? (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
            {item.badge > 99 ? "99+" : item.badge}
          </span>
        ) : null}
      </span>
      <span className="truncate">{item.shortLabel}</span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute bottom-0.5 h-[3px] w-4 origin-center rounded-full bg-primary transition-transform duration-200",
          active ? "scale-x-100" : "scale-x-0"
        )}
      />
    </>
  );
}

const tabClass =
  "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors duration-200";

function Tab({ item, active }: { item: TabItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(tabClass, active ? "text-primary" : "text-neutral-500 dark:text-neutral-400")}
    >
      <TabInner item={item} active={active} />
    </Link>
  );
}

function MoreTab({
  item,
  active,
  onClick,
}: {
  item: TabItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={active}
      className={cn(tabClass, active ? "text-primary" : "text-neutral-500 dark:text-neutral-400")}
    >
      <TabInner item={item} active={active} />
    </button>
  );
}
