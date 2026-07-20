import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { BudgetsManager, type BudgetRow } from "@/components/budgets/BudgetsManager";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { formatMoney } from "@/lib/format";
import { budgetStatus } from "@/lib/budgets";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

// The monthly Budgets view, extracted so it can render inside the combined
// Costs page under the ?view=budgets tab. Self-guards like the standalone page.
export async function BudgetsPanel() {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [categories, spendByCat, currency] = await Promise.all([
    prisma.expenseCategory.findMany({
      where: { organizationId },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, monthlyBudget: true },
    }),
    prisma.expense.groupBy({
      by: ["categoryId"],
      where: { organizationId, date: { gte: monthStart }, categoryId: { not: null } },
      _sum: { amount: true },
    }),
    getCurrencySymbol(organizationId),
  ]);

  const t = (await getT()).budgets;

  const spent = new Map<string, number>();
  for (const g of spendByCat) {
    if (g.categoryId) spent.set(g.categoryId, Number(g._sum.amount ?? 0));
  }

  const rows: BudgetRow[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    spent: spent.get(c.id) ?? 0,
    budget: c.monthlyBudget != null ? Number(c.monthlyBudget) : null,
  }));

  // Alert roll-up over categories that have a budget set.
  let overCount = 0;
  let nearCount = 0;
  let totalBudget = 0;
  let totalSpentBudgeted = 0;
  for (const r of rows) {
    if (r.budget == null || r.budget <= 0) continue;
    totalBudget += r.budget;
    totalSpentBudgeted += r.spent;
    const s = budgetStatus(r.spent, r.budget);
    if (s.state === "over") overCount += 1;
    else if (s.state === "near") nearCount += 1;
  }
  const budgetedCount = rows.filter((r) => r.budget != null && r.budget > 0).length;

  return (
    <>
      <PageHeader title={t.title} description={t.subtitle} />

      {budgetedCount > 0 && (
        <div className="grid animate-fade-up grid-cols-2 gap-3">
          <StatTile value={formatMoney(totalSpentBudgeted, currency)} label={t.spentLabel} />
          <StatTile value={formatMoney(totalBudget, currency)} label={t.budgetLabel} />
        </div>
      )}

      {(overCount > 0 || nearCount > 0) && (
        <Link
          href="#budgets"
          className="flex items-center gap-3 rounded-xl border border-warning-text/20 bg-warning-soft px-4 py-2.5 text-sm"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning-text" />
          <span className="min-w-0 flex-1 font-medium text-warning-text">
            {overCount > 0 && t.alertOver.replace("{n}", String(overCount))}
            {overCount > 0 && nearCount > 0 && " · "}
            {nearCount > 0 && t.alertNear.replace("{n}", String(nearCount))}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-warning-text/70" />
        </Link>
      )}
      {budgetedCount > 0 && overCount === 0 && nearCount === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success-text" />
          {t.allWithin}
        </div>
      )}

      <div id="budgets" className="scroll-mt-4">
        <BudgetsManager rows={rows} currency={currency} />
      </div>
    </>
  );
}
