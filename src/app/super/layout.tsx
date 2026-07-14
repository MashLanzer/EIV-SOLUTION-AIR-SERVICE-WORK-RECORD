import Link from "next/link";
import { Building2, LayoutDashboard, ShieldCheck } from "lucide-react";

import { requireSuperAdmin } from "@/lib/superAdmin";

// The platform console lives outside the per-company /admin area and is gated
// by requireSuperAdmin (env allowlist). Deliberately plain chrome so it never
// gets mistaken for a customer-facing screen.
export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="sticky top-0 z-20 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Link href="/super" className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100">
              <ShieldCheck className="h-5 w-5" />
              <span>Platform</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/super"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </Link>
              <Link
                href="/super/orgs"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <Building2 className="h-4 w-4" />
                Companies
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden truncate text-xs text-neutral-500 dark:text-neutral-400 sm:inline">
              {email}
            </span>
            <Link
              href="/admin"
              className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Exit to app
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
