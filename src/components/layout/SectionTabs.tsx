import { getOrgFeatures } from "@/lib/features";
import { canSeeHref } from "@/lib/navPermissions";
import { requireOfficeAccess } from "@/lib/authz";
import { requireOrgId } from "@/lib/orgScope";
import { getT } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n";
import { SectionTabsBar } from "@/components/layout/SectionTabsBar";

export type SectionFamily = "overview" | "money" | "structure";

// The secondary destinations grouped by family. These used to live in the
// APK's center-menu "More" list; they now surface as a segmented sub-nav at the
// top of each family's pages (like the profile tabs), so the FAB keeps only the
// three create actions. Each item still guards its own page with
// requirePermission — this control is only cosmetic, so items the caller can't
// use (or whose module is off) are filtered out entirely.
const FAMILIES: Record<
  SectionFamily,
  { href: string; label: (d: Dictionary) => string }[]
> = {
  overview: [
    { href: "/admin", label: (d) => d.nav.dashboard },
    { href: "/admin/records", label: (d) => d.nav.records },
    { href: "/admin/review", label: (d) => d.nav.reviewQueue },
    { href: "/admin/feedback", label: (d) => d.nav.feedback },
  ],
  money: [
    { href: "/admin/financials", label: (d) => d.nav.financials },
    { href: "/admin/estimates", label: (d) => d.nav.estimates },
    { href: "/admin/invoices", label: (d) => d.nav.invoices },
    { href: "/admin/expenses", label: (d) => d.nav.expenses },
    { href: "/admin/reports", label: (d) => d.nav.payReport },
  ],
  structure: [
    { href: "/admin/projects", label: (d) => d.nav.projects },
    { href: "/admin/teams", label: (d) => d.teams.tabTeams },
    { href: "/admin/customers", label: (d) => d.nav.customers },
    { href: "/admin/workers", label: (d) => d.nav.workers },
    { href: "/admin/photos", label: (d) => d.nav.photos },
  ],
};

export async function SectionTabs({ family }: { family: SectionFamily }) {
  const { session, permissions } = await requireOfficeAccess();
  const organizationId = requireOrgId(session);
  const features = await getOrgFeatures(organizationId);

  // Hide destinations whose module is turned off for the company, mirroring the
  // sidebar's feature gating.
  const disabled = new Set<string>();
  if (!features.invoicing) {
    disabled.add("/admin/invoices");
    disabled.add("/admin/financials");
    disabled.add("/admin/payments");
  }
  if (!features.estimates) disabled.add("/admin/estimates");

  const dict = await getT();
  const items = FAMILIES[family]
    .filter((i) => !disabled.has(i.href) && canSeeHref(i.href, permissions))
    .map((i) => ({ href: i.href, label: i.label(dict) }));

  // A single tab isn't a switch — don't render a lone control.
  if (items.length < 2) return null;

  return <SectionTabsBar items={items} ariaLabel={dict.nav.sections} />;
}
