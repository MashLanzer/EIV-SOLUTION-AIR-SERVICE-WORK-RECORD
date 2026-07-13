"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// Segmented control that switches between the Projects and Teams views - Teams
// lives "inside" Projects now, so it no longer has its own nav entry.
export function ProjectsTeamsTabs() {
  const pathname = usePathname();
  const t = useT().teams;
  const TABS = [
    { href: "/admin/projects", label: t.tabProjects },
    { href: "/admin/teams", label: t.tabTeams },
  ];
  return (
    <div className="inline-flex rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-1">
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors",
              active
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
