import Link from "next/link";

import { cn } from "@/lib/utils";

// A single filter/toggle pill (a link). Used for the status filters, period /
// grouping toggles and skill filters across the app so they all look and
// behave the same: rounded pill, solid dark when active, with an optional
// count badge.
export function FilterChip({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-transparent bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
          : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
      )}
    >
      {children}
      {count !== undefined ? (
        <span
          className={cn(
            "rounded-full px-1.5 text-xs tabular-nums",
            active
              ? "bg-white/20 dark:bg-neutral-900/20"
              : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
          )}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
