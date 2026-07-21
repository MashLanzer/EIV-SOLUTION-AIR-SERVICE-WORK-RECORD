"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Building2, LayoutDashboard, TrendingUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; icon: LucideIcon; exact: boolean }[] = [
  { href: "/super", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/super/orgs", label: "Companies", icon: Building2, exact: false },
  { href: "/super/activity", label: "Activity", icon: Activity, exact: false },
  { href: "/super/growth", label: "Insights", icon: TrendingUp, exact: false },
];

// The platform console's phone navigation: the app's fixed bottom tab bar with
// four core destinations. Owner tools and one-off actions live in the header's
// Console menu. Shows inside the native APK too (no `native:hidden`), since the
// console has no create-FAB flow.
export function SuperTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Platform"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-lg shadow-[0_-1px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-1px_16px_rgba(0,0,0,0.35)] pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      {TABS.map((item) => {
        const Icon = item.icon;
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors duration-200",
              active ? "text-primary" : "text-neutral-500 dark:text-neutral-400"
            )}
          >
            <Icon
              className={cn("h-5 w-5 transition-transform duration-200", active && "scale-110")}
              strokeWidth={active ? 2.5 : 2}
            />
            <span className="truncate">{item.label}</span>
            <span
              aria-hidden="true"
              className={cn(
                "absolute bottom-0.5 h-[3px] w-4 origin-center rounded-full bg-primary transition-transform duration-200",
                active ? "scale-x-100" : "scale-x-0"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
