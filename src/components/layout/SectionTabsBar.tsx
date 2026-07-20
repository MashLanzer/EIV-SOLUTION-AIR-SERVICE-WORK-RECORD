"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export interface SectionTab {
  href: string;
  label: string;
}

// A link-based segmented control for switching between the sibling sections of
// a "family" (Records/Quality, Money, Structure). Same pill look as the profile
// tabs; the active segment is derived from the URL so every sibling page shares
// one control. Scrolls horizontally when a family has more segments than fit.
export function SectionTabsBar({
  items,
  ariaLabel,
}: {
  items: SectionTab[];
  ariaLabel?: string;
}) {
  const pathname = usePathname();
  return (
    <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="inline-flex gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900 p-1"
      >
        {items.map((it) => {
          // "/admin" (the dashboard) is a prefix of every admin route, so it
          // only lights up on an exact match; the rest use prefix matching so
          // detail pages keep their section active.
          const active =
            it.href === "/admin"
              ? pathname === it.href
              : pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <Link
              key={it.href}
              href={it.href}
              role="tab"
              aria-selected={active}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-center text-sm font-medium transition-[color,background-color,box-shadow,transform] duration-200 ease-[var(--ease-out)] active:scale-[0.97]",
                active
                  ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                  : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
              )}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
