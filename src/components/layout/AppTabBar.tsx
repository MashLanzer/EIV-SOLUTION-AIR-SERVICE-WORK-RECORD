"use client";

import Link from "next/link";
import { useState } from "react";
import { Lock, Plus } from "lucide-react";

import {
  AppMenuSheet,
  type CreateData,
  type CreateItem,
  type MoreItem,
} from "@/components/layout/AppMenuSheet";
import { isTabActive, type TabItem } from "@/components/layout/BottomTabBar";
import { useT } from "@/components/i18n/LocaleProvider";
import { tapHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

// A concave semicircle punched out of the bar's top-centre, so the raised FAB
// nests in a notch. Slightly larger than the FAB (r≈28px) for a clean gap.
const NOTCH_MASK =
  "radial-gradient(circle 34px at 50% 0, transparent 33px, #000 34px)";

// Native (APK-only) bottom navigation: a floating, rounded bar with a notched
// centre FAB that opens the Create + More menu. The surface adapts to the
// active theme via tokens; the active tab expands into a pill with its label.
// Shown only inside the Capacitor WebView (html[data-native]); the browser
// keeps the plain edge-to-edge BottomTabBar.
export function AppTabBar({
  items,
  pathname,
  createItems,
  moreItems,
  createData,
}: {
  // The real destination tabs (3 or 4), split into balanced left/right groups
  // so the centre FAB always lines up with the notch.
  items: TabItem[];
  pathname: string;
  createItems: CreateItem[];
  moreItems: MoreItem[];
  createData?: CreateData | null;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const n = useT().nav;
  const split = Math.ceil(items.length / 2);
  const left = items.slice(0, split);
  const right = items.slice(split);

  return (
    <>
      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 hidden native:block sm:hidden px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]",
          // Ride above the menu sheet while open so the FAB (now an ×) stays
          // visible over the dimmed content and doubles as the close button.
          menuOpen ? "z-50" : "z-30"
        )}
      >
        {/* drop-shadow on the wrapper traces the notched bar + FAB so the float
            shadow follows the cut-out shape. */}
        <div
          className="pointer-events-auto relative mx-auto max-w-md animate-fade-up"
          style={{ filter: "drop-shadow(0 6px 22px rgba(0,0,0,0.18))" }}
        >
          <nav
            aria-label={n.sections}
            className="flex h-16 items-stretch rounded-[28px] border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-lg"
            style={{ WebkitMaskImage: NOTCH_MASK, maskImage: NOTCH_MASK }}
          >
            <div className="flex flex-1 items-center justify-around pl-2">
              {left.map((item) => (
                <Tab key={item.href} item={item} active={isTabActive(pathname, item)} />
              ))}
            </div>
            <span aria-hidden="true" className="w-16 shrink-0" />
            <div className="flex flex-1 items-center justify-around pr-2">
              {right.map((item) => (
                <Tab key={item.href} item={item} active={isTabActive(pathname, item)} />
              ))}
            </div>
          </nav>

          {/* Centre FAB, nested in the notch. Plus rotates into an × when open. */}
          <button
            type="button"
            onClick={() => {
              tapHaptic(14);
              setMenuOpen((v) => !v);
            }}
            aria-label={n.menu}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className="absolute left-1/2 top-0 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-black/25 transition-transform duration-200 active:scale-90"
          >
            <Plus
              className={cn(
                "h-6 w-6 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                menuOpen && "rotate-[135deg]"
              )}
            />
          </button>
        </div>
      </div>

      <AppMenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        createItems={createItems}
        moreItems={moreItems}
        createData={createData}
      />
    </>
  );
}

function Tab({ item, active }: { item: TabItem; active: boolean }) {
  const Icon = item.icon;
  // Locked: shown greyed with a lock, not navigable (the page also guards it).
  if (item.locked) {
    return (
      <div
        aria-label={item.label}
        aria-disabled="true"
        className="flex items-center justify-center text-neutral-300 dark:text-neutral-600"
      >
        <span className="relative flex items-center rounded-full px-2.5 py-2">
          <span className="relative flex shrink-0 items-center justify-center">
            <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
            <Lock className="absolute -right-1.5 -top-1 h-3 w-3" strokeWidth={2.5} />
          </span>
        </span>
      </div>
    );
  }
  return (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      onClick={() => tapHaptic()}
      className="flex items-center justify-center"
    >
      <span
        className={cn(
          "flex items-center rounded-full px-2.5 py-2 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          active
            ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            : "text-neutral-500 dark:text-neutral-400"
        )}
      >
        <span className="relative flex shrink-0 items-center justify-center">
          <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
          {item.badge ? (
            <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          ) : null}
        </span>
        {/* Label expands only when active (grid 0fr→1fr animates the width). */}
        <span
          className="grid transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ gridTemplateColumns: active ? "1fr" : "0fr" }}
        >
          <span className="overflow-hidden">
            <span className="whitespace-nowrap pl-2.5 text-xs font-semibold">
              {item.shortLabel}
            </span>
          </span>
        </span>
      </span>
    </Link>
  );
}
