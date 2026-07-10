"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";

import { isTabActive, type TabItem } from "@/components/layout/BottomTabBar";
import { CreateSheet, type CreateItem } from "@/components/layout/CreateSheet";
import { cn } from "@/lib/utils";

// Native (APK-only) bottom navigation: four tabs with a raised center FAB that
// opens a role-aware "create" sheet. Shown only inside the Capacitor WebView
// (html[data-native]); the browser keeps the plain BottomTabBar.
export function AppTabBar({
  items,
  pathname,
  createItems,
}: {
  items: TabItem[];
  pathname: string;
  createItems: CreateItem[];
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const left = items.slice(0, 2);
  const right = items.slice(2, 4);

  return (
    <>
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 hidden native:flex sm:hidden items-stretch border-t border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-lg shadow-[0_-1px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_-1px_16px_rgba(0,0,0,0.4)] pb-[env(safe-area-inset-bottom)]"
      >
        {left.map((item) => (
          <Tab key={item.href} item={item} pathname={pathname} />
        ))}

        {/* Center FAB */}
        <div className="flex w-16 shrink-0 items-start justify-center">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Create"
            className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/20 active:scale-95 transition-transform"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {right.map((item) => (
          <Tab key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      <CreateSheet open={sheetOpen} onClose={() => setSheetOpen(false)} items={createItems} />
    </>
  );
}

function Tab({ item, pathname }: { item: TabItem; pathname: string }) {
  const isActive = isTabActive(pathname, item);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors duration-200",
        isActive ? "text-primary" : "text-neutral-500 dark:text-neutral-400"
      )}
    >
      <span className="relative">
        <Icon
          className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-110")}
          strokeWidth={isActive ? 2.5 : 2}
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
          isActive ? "scale-x-100" : "scale-x-0"
        )}
      />
    </Link>
  );
}
