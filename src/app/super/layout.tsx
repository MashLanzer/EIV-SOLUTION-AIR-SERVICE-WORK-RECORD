import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { HeaderAccountMenu } from "@/components/layout/HeaderAccountMenu";
import { RouteTransition } from "@/components/layout/RouteTransition";
import { ConsoleMenu } from "@/components/super/ConsoleMenu";
import { SuperNav } from "@/components/super/SuperNav";
import { SuperSearch } from "@/components/super/SuperSearch";
import { SuperTabBar } from "@/components/super/SuperTabBar";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { getActiveAnnouncement } from "@/lib/announcements";

// The platform console lives outside the per-company /admin area and is gated
// by requireSuperAdmin (env allowlist) — it's the app owner's own console.
// Shares the app's palette, background glow and motion so it feels like the
// rest of the app, with distinct "Platform" chrome so it's never mistaken for
// a customer-facing screen. Four core tabs; owner tools + one-off actions live
// in the header's Console menu.
export default async function SuperLayout({ children }: { children: React.ReactNode }) {
  const { session, email, isOwner } = await requireSuperAdmin();
  const announcement = await getActiveAnnouncement();

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <header className="sticky top-0 z-20 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur native:pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-5xl px-4">
          {/* Top row: brand + nav (desktop) + search / console menu / account. */}
          <div className="flex h-14 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <Link
                href="/super"
                className="flex shrink-0 items-center gap-2 font-semibold text-neutral-900 dark:text-neutral-100"
              >
                <ShieldCheck className="h-5 w-5" />
                <span>Platform</span>
              </Link>
              <SuperNav className="hidden items-center gap-1 text-sm sm:flex" />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <SuperSearch />
              <ConsoleMenu announcement={announcement?.message ?? null} isOwner={isOwner} />
              <HeaderAccountMenu
                name={session.user.name ?? email}
                avatarUrl={session.user.avatarUrl ?? null}
                profileHref="/admin/profile"
                settingsHref="/admin/settings"
              />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:pb-6">
        <RouteTransition>{children}</RouteTransition>
      </main>

      {/* Phone nav: the app's fixed bottom tab bar (desktop keeps the inline
          nav in the header above). */}
      <SuperTabBar />
    </div>
  );
}
