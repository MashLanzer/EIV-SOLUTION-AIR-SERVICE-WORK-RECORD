import Link from "next/link";

import { cn } from "@/lib/utils";

export interface SegmentedNavItem {
  label: string;
  href: string;
  active: boolean;
}

// A link-based segmented control (the pill switch used across the app): a
// neutral track with the active segment raised on a white/dark chip. Each
// segment is a real link, so it works without client JS and is shareable.
export function SegmentedNav({
  items,
  ariaLabel,
  className,
}: {
  items: SegmentedNavItem[];
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900 p-1",
        className
      )}
    >
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          role="tab"
          aria-selected={it.active}
          className={cn(
            "rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors",
            it.active
              ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
              : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
          )}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}
