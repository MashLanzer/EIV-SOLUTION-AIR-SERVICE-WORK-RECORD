"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Contact,
  BarChart3,
} from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard, exact: true },
  { href: "/admin/records", label: "Records", shortLabel: "Records", icon: ClipboardList, exact: false },
  { href: "/admin/customers", label: "Customers", shortLabel: "Customers", icon: Contact, exact: false },
  { href: "/admin/reports", label: "Pay Report", shortLabel: "Pay", icon: BarChart3, exact: false },
  { href: "/admin/workers", label: "Workers", shortLabel: "Workers", icon: Users, exact: false },
];

function isItemActive(pathname: string, item: (typeof NAV_ITEMS)[number]) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive = isItemActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent-soft text-primary"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

// A fixed bottom tab bar (icon + short label) reads as a native mobile app
// rather than a shrunk-down desktop sidebar - this is the primary nav on
// phones, replacing the old hamburger + slide-out drawer.
function BottomTabBar({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Admin sections"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = isItemActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
              isActive
                ? "text-primary"
                : "text-slate-500 dark:text-slate-400"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
            <span className="truncate">{item.shortLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sm:flex">
        <div className="flex h-16 items-center border-b border-slate-200 dark:border-slate-800 px-4">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks pathname={pathname} />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 p-3">
          <span className="truncate text-sm text-slate-500 dark:text-slate-400">{name}</span>
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile top bar - just branding + sign out now that navigation
          lives in the bottom tab bar instead of a hamburger drawer. */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:hidden">
        <Logo />
        <LogoutButton />
      </header>

      <BottomTabBar pathname={pathname} />
    </>
  );
}
