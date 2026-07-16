import Link from "next/link";
import { Building2, LayoutDashboard, ScrollText, ShieldCheck, TrendingUp } from "lucide-react";

import { requireSuperAdmin } from "@/lib/superAdmin";

const NAV = [
  { href: "/super", label: "Overview", icon: LayoutDashboard },
  { href: "/super/orgs", label: "Companies", icon: Building2 },
  { href: "/super/growth", label: "Growth", icon: TrendingUp },
  { href: "/super/audit", label: "Audit", icon: ScrollText },
];

const navLinkClass =
  "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 whitespace-nowrap text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800";

// The platform console lives outside the per-company /admin area and is gated
// by requireSuperAdmin (env allowlist). Deliberately plain chrome so it never
// gets mistaken for a customer-facing screen.
export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireSuperAdmin();

  return (
    <div className="min-h-screen overflow-x-hidden bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-20 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur native:pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-5xl px-4">
          {/* Top row: brand + account. Nav sits inline here on desktop. */}
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <Link
                href="/super"
                className="flex shrink-0 items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100"
              >
                <ShieldCheck className="h-5 w-5" />
                <span>Platform</span>
              </Link>
              <nav className="hidden items-center gap-1 text-sm sm:flex">
                {NAV.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className={navLinkClass}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden max-w-[12rem] truncate text-xs text-neutral-500 dark:text-neutral-400 sm:inline">
                {email}
              </span>
              <Link
                href="/admin"
                className="shrink-0 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Exit to app
              </Link>
            </div>
          </div>

          {/* Mobile nav: a horizontally scrollable strip, so the tabs never
              push the page wider than the screen. */}
          <nav className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 pb-2 text-sm sm:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={navLinkClass}>
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 native:pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
