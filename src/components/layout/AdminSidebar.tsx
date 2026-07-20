"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  ClipboardCheck,
  Users,
  Users2,
  Contact,
  BarChart3,
  FileText,
  FolderKanban,
  FolderPlus,
  Images,
  Lock,
  MessageSquareHeart,
  Receipt,
  ShieldCheck,
  UserPlus,
  Wallet,
} from "lucide-react";

import { ActivityBell } from "@/components/activity/ActivityBell";
import { AppTabBar } from "@/components/layout/AppTabBar";
import type { CreateData, CreateItem } from "@/components/layout/AppMenuSheet";
import { BottomTabBar, isTabActive, type TabItem } from "@/components/layout/BottomTabBar";
import { HeaderAccountMenu } from "@/components/layout/HeaderAccountMenu";
import { HeaderOpinionsButton } from "@/components/layout/HeaderOpinionsButton";
import { HeaderToolsMenu } from "@/components/layout/HeaderToolsMenu";
import { Logo } from "@/components/layout/Logo";
import { SearchCommand } from "@/components/search/SearchCommand";
import { useT } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n";
import { canSeeHref } from "@/lib/navPermissions";
import { cn } from "@/lib/utils";

function navItems(n: Dictionary["nav"]): TabItem[] {
  return [
  { href: "/admin", label: n.dashboard, shortLabel: n.home, icon: LayoutDashboard, exact: true },
  { href: "/admin/review", label: n.reviewQueue, shortLabel: n.reviewQueue, icon: ClipboardCheck, exact: false },
  { href: "/admin/schedule", label: n.schedule, shortLabel: n.schedule, icon: CalendarDays, exact: false },
  { href: "/admin/projects", label: n.projects, shortLabel: n.projects, icon: FolderKanban, exact: false, alsoActiveFor: ["/admin/teams"] },
  { href: "/admin/photos", label: n.photos, shortLabel: n.photos, icon: Images, exact: false },
  { href: "/admin/records", label: n.records, shortLabel: n.records, icon: ClipboardList, exact: false },
  { href: "/admin/feedback", label: n.feedback, shortLabel: n.feedback, icon: MessageSquareHeart, exact: false },
  { href: "/admin/customers", label: n.customers, shortLabel: n.customers, icon: Contact, exact: false },
  { href: "/admin/estimates", label: n.estimates, shortLabel: n.estimates, icon: FileText, exact: false },
  { href: "/admin/invoices", label: n.invoices, shortLabel: n.invoices, icon: Receipt, exact: false },
  { href: "/admin/financials", label: n.financials, shortLabel: n.financials, icon: Wallet, exact: false },
  { href: "/admin/reports", label: n.payReport, shortLabel: n.pay, icon: BarChart3, exact: false },
  { href: "/admin/workers", label: n.workers, shortLabel: n.workers, icon: Users, exact: false },
  { href: "/admin/roles", label: n.roles, shortLabel: n.roles, icon: ShieldCheck, exact: false },
  ];
}

// Native app bar (APK): four real destination tabs. Everything else (create
// actions, secondary nav, settings, sign out) lives in the center menu sheet.
function appTabItems(n: Dictionary["nav"], invoicingOn: boolean): TabItem[] {
  // The money slot: Financials (billing analytics) as the entry to the money
  // cluster when the invoicing module is on. When it's off, Financials/Estimates/
  // Invoices are all gated away, so fall back to Pay Report (never gated) — that
  // keeps the bar at four tabs instead of collapsing to three.
  const moneyTab: TabItem = invoicingOn
    ? {
        href: "/admin/financials",
        label: n.financials,
        shortLabel: n.financials,
        icon: Wallet,
        exact: false,
        alsoActiveFor: ["/admin/sales", "/admin/estimates", "/admin/invoices", "/admin/reports"],
      }
    : {
        href: "/admin/reports",
        label: n.payReport,
        shortLabel: n.pay,
        icon: BarChart3,
        exact: false,
      };
  return [
  { href: "/admin", label: n.dashboard, shortLabel: n.home, icon: LayoutDashboard, exact: true },
  // Projects is the entry to the whole "structure" cluster, so it stays lit on
  // its sibling sub-nav pages (Teams / Workers / Customers / Photos).
  { href: "/admin/projects", label: n.projects, shortLabel: n.projects, icon: FolderKanban, exact: false, alsoActiveFor: ["/admin/teams", "/admin/workers", "/admin/customers", "/admin/photos"] },
  { href: "/admin/schedule", label: n.schedule, shortLabel: n.schedule, icon: CalendarDays, exact: false },
  moneyTab,
  ];
}

function createItems(n: Dictionary["nav"]): CreateItem[] {
  return [
  { href: "/admin/projects/new", label: n.newProject, icon: FolderPlus },
  { href: "/admin/workers/new", label: n.newWorker, icon: UserPlus },
  { href: "/admin/teams/new", label: n.newTeam, icon: Users2 },
  { href: "/admin/estimates/new", label: n.newEstimate, icon: FileText },
  { href: "/admin/invoices/new", label: n.newInvoice, icon: Receipt },
  ];
}

function NavLinks({
  items,
  pathname,
  ariaLabel,
  pendingLabel,
}: {
  items: TabItem[];
  pathname: string;
  ariaLabel: string;
  pendingLabel: string;
}) {
  return (
    <nav aria-label={ariaLabel} className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        // Locked: shown greyed with a lock on the right, not a link.
        if (item.locked) {
          return (
            <div
              key={item.href}
              aria-disabled="true"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-400 dark:text-neutral-600"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </div>
          );
        }
        const isActive = isTabActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-neutral-100 dark:bg-neutral-800 text-primary"
                : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-white">
                <span aria-hidden="true">{item.badge > 99 ? "99+" : item.badge}</span>
                <span className="sr-only">
                  {item.badge} {pendingLabel}
                </span>
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar({
  name,
  avatarUrl = null,
  isSuperAdmin = false,
  permissions = [],
  features,
  pendingReviewCount = 0,
  latestActivityAt = null,
  unreadNotifications = 0,
  createData = null,
}: {
  name: string;
  avatarUrl?: string | null;
  isSuperAdmin?: boolean;
  // Effective capabilities of the signed-in user (from their position, else
  // legacy-role defaults). Real admins get the full set via the fallback, so
  // they never lose a destination; narrower positions see only what they can use.
  permissions?: string[];
  features?: { invoicing: boolean; estimates: boolean; portal: boolean };
  pendingReviewCount?: number;
  latestActivityAt?: number | null;
  unreadNotifications?: number;
  createData?: CreateData | null;
}) {
  const platformHref = isSuperAdmin ? "/super" : null;
  const pathname = usePathname();
  const t = useT();
  // Header quick-tools visibility mirrors the pages they open.
  const canManageMaterials = permissions.includes("expenses.manage");
  const canReview = permissions.includes("records.review");
  // Hrefs to hide because their module is turned off for this company.
  const disabledHrefs = new Set<string>();
  if (features && !features.invoicing) {
    disabledHrefs.add("/admin/invoices");
    disabledHrefs.add("/admin/invoices/new");
    disabledHrefs.add("/admin/financials");
    disabledHrefs.add("/admin/payments");
  }
  if (features && !features.estimates) {
    disabledHrefs.add("/admin/estimates");
    disabledHrefs.add("/admin/estimates/new");
  }
  const byFeature = <T extends { href: string }>(list: T[]) =>
    disabledHrefs.size ? list.filter((i) => !disabledHrefs.has(i.href)) : list;
  // Modules turned off for the company are removed entirely; destinations the
  // position can't use are kept but marked `locked` (shown greyed with a lock,
  // not navigable) so the app doesn't look empty. Real security is server-side
  // (each page guards with requirePermission); locking is cosmetic.
  const prep = <T extends { href: string; locked?: boolean }>(list: T[]): T[] =>
    byFeature(list).map((i) => (canSeeHref(i.href, permissions) ? i : { ...i, locked: true }));
  const items = prep(navItems(t.nav)).map((item) =>
    item.href === "/admin/review" && !item.locked ? { ...item, badge: pendingReviewCount } : item
  );
  // Records is no longer a native tab, so the review badge rides the Dashboard
  // tab (where the review queue lives) in the APK bar.
  const appTabs = prep(appTabItems(t.nav, features ? features.invoicing : true)).map((item) =>
    item.href === "/admin" && !item.locked ? { ...item, badge: pendingReviewCount } : item
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sm:flex">
        <div className="flex h-16 items-center border-b border-neutral-200 dark:border-neutral-800 px-4">
          <Logo />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks
            items={items}
            pathname={pathname}
            ariaLabel={t.nav.primary}
            pendingLabel={t.nav.pendingReviewLabel}
          />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-neutral-200 dark:border-neutral-800 p-3">
          <span className="truncate text-sm text-neutral-500 dark:text-neutral-400">{name}</span>
          <div className="flex items-center gap-2">
            <SearchCommand />
            {canReview && <HeaderOpinionsButton />}
            {canManageMaterials && <HeaderToolsMenu />}
            <ActivityBell href="/admin/activity" latestActivityAt={latestActivityAt} unreadCount={unreadNotifications} />
            <HeaderAccountMenu
              name={name}
              avatarUrl={avatarUrl}
              profileHref="/admin/profile"
              settingsHref="/admin/settings"
              platformHref={platformHref}
            />
          </div>
        </div>
      </aside>

      {/* Mobile top bar - just branding + settings now that navigation
          lives in the bottom tab bar instead of a hamburger drawer. */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 px-4 backdrop-blur sm:hidden native:h-auto native:min-h-14 native:pt-[env(safe-area-inset-top)]">
        <Logo />
        <div className="flex items-center gap-2">
          <SearchCommand />
          {canReview && <HeaderOpinionsButton />}
          {canManageMaterials && <HeaderToolsMenu />}
          <ActivityBell href="/admin/activity" latestActivityAt={latestActivityAt} unreadCount={unreadNotifications} />
          <HeaderAccountMenu
            name={name}
            avatarUrl={avatarUrl}
            profileHref="/admin/profile"
            settingsHref="/admin/settings"
            platformHref={platformHref}
          />
        </div>
      </header>

      <BottomTabBar items={items} pathname={pathname} />
      <AppTabBar
        items={appTabs}
        pathname={pathname}
        createItems={prep(createItems(t.nav))}
        createData={createData}
      />
    </>
  );
}
