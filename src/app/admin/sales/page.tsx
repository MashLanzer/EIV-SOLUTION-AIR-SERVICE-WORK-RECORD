import Link from "next/link";
import { redirect } from "next/navigation";

import { SectionTabs } from "@/components/layout/SectionTabs";
import { EstimatesPanel } from "@/components/billing/EstimatesPanel";
import { InvoicesPanel } from "@/components/billing/InvoicesPanel";
import { requireOfficeAccess } from "@/lib/authz";
import { requireOrgId } from "@/lib/orgScope";
import { getOrgFeatures } from "@/lib/features";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

type SalesView = "estimates" | "invoices";

// The unified Sales page: Estimates and Invoices as two views on one page,
// switched by a nested sub-nav that sits *below* the money SectionTabs (a
// sub-nav inside the sub-nav). Each view reuses the standalone list body via
// EstimatesPanel/InvoicesPanel, which self-guard with requirePermission +
// requireFeature. We clamp the active view to what the caller can actually see.
export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; status?: string }>;
}) {
  const { session, permissions } = await requireOfficeAccess();
  const organizationId = requireOrgId(session);
  const features = await getOrgFeatures(organizationId);

  const canEstimates = features.estimates && permissions.includes("estimates.manage");
  const canInvoices = features.invoicing && permissions.includes("invoices.manage");
  // Neither module is available to this user — nothing to show here.
  if (!canEstimates && !canInvoices) redirect("/admin");

  const { view: rawView, q, status } = await searchParams;
  let view: SalesView;
  if (rawView === "invoices") view = canInvoices ? "invoices" : "estimates";
  else if (rawView === "estimates") view = canEstimates ? "estimates" : "invoices";
  else view = canEstimates ? "estimates" : "invoices";

  const dict = await getT();
  const basePath = "/admin/sales";
  const innerTabs = [
    { view: "estimates" as const, label: dict.nav.estimates, show: canEstimates },
    { view: "invoices" as const, label: dict.nav.invoices, show: canInvoices },
  ].filter((tab) => tab.show);

  return (
    <div className="flex flex-col gap-4">
      <SectionTabs family="money" />

      {/* Nested sub-nav: switch between the two sales views. Only shown when
          both modules are available — a lone tab isn't a switch. Active state
          is derived from ?view here (server-rendered), not the pathname. */}
      {innerTabs.length > 1 && (
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            role="tablist"
            aria-label={dict.nav.sections}
            className="inline-flex gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900 p-1"
          >
            {innerTabs.map((tab) => {
              const active = tab.view === view;
              return (
                <Link
                  key={tab.view}
                  href={`${basePath}?view=${tab.view}`}
                  role="tab"
                  aria-selected={active}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors",
                    active
                      ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                      : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {view === "estimates" ? (
        <EstimatesPanel q={q} status={status} basePath={basePath} />
      ) : (
        <InvoicesPanel q={q} status={status} basePath={basePath} />
      )}
    </div>
  );
}
