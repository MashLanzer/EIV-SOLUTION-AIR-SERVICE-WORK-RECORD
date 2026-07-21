"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, ScrollText, TrendingUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/super", label: "Overview", icon: LayoutDashboard },
  { href: "/super/orgs", label: "Companies", icon: Building2 },
  { href: "/super/growth", label: "Growth", icon: TrendingUp },
  { href: "/super/audit", label: "Audit", icon: ScrollText },
];

// Platform console nav, styled like the app's section tabs: an active pill with
// the shared easing/press so the owner console feels like the rest of the app.
export function SuperNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={className}>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/super" ? pathname === "/super" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 transition-[color,background-color,box-shadow,transform] duration-200 ease-[var(--ease-out)] active:scale-[0.97]",
              active
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
