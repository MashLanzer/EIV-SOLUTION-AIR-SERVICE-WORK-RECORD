import Link from "next/link";

import { SectionTabs } from "@/components/layout/SectionTabs";
import { ExpensesPanel } from "@/components/costs/ExpensesPanel";
import { BudgetsPanel } from "@/components/costs/BudgetsPanel";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CostsView = "expenses" | "budgets";

// The unified Costs page: the Expenses ledger and the monthly Budgets as two
// views on one page, switched by a nested sub-nav below the money SectionTabs.
// Both need the same capability (expenses.manage), so no per-view gating.
export default async function AdminCostsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; category?: string; range?: string }>;
}) {
  await requirePermission("expenses.manage");
  const { view: rawView, q, category, range } = await searchParams;
  const view: CostsView = rawView === "budgets" ? "budgets" : "expenses";

  const dict = await getT();
  const basePath = "/admin/costs";
  const innerTabs: { view: CostsView; label: string }[] = [
    { view: "expenses", label: dict.nav.expenses },
    { view: "budgets", label: dict.nav.budgets },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionTabs family="money" />

      {/* Nested sub-nav: Expenses ↔ Budgets, active state from ?view. */}
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

      {view === "budgets" ? (
        <BudgetsPanel />
      ) : (
        <ExpensesPanel q={q} category={category} range={range} basePath={basePath} />
      )}
    </div>
  );
}
