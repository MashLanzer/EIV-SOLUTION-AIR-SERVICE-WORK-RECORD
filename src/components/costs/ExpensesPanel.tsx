import { AlertTriangle, Download, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { ExpensesManager, type ExpenseRow, type RuleRow } from "@/components/expenses/ExpensesManager";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { formatMoney } from "@/lib/format";
import { buildExpenseWhere, EXPENSE_RANGES, type ExpenseRange } from "@/lib/expenses";
import { detectExpenseAnomalies, type AnomalyReason } from "@/lib/expenseRules";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

// The Expenses ledger, extracted so it can render inside the combined Costs
// page under the ?view=expenses tab. Filter/search links post back to
// `basePath`; the export route stays on /admin/expenses. Self-guards.
export async function ExpensesPanel({
  q,
  category: rawCategory,
  range: rawRange,
  basePath,
}: {
  q?: string;
  category?: string;
  range?: string;
  basePath: string;
}) {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);
  const query = q?.trim() || undefined;
  const range: ExpenseRange = EXPENSE_RANGES.includes(rawRange as ExpenseRange)
    ? (rawRange as ExpenseRange)
    : "all";
  const categoryId = rawCategory || undefined;

  const where = buildExpenseWhere({ organizationId, q: query, categoryId, range });
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [rows, categories, ruleRows, projects, filteredAgg, monthAgg, currency] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      take: 200,
      select: {
        id: true,
        vendor: true,
        amount: true,
        date: true,
        note: true,
        receiptUrl: true,
        categoryId: true,
        category: { select: { name: true } },
        projectId: true,
        project: { select: { name: true } },
      },
    }),
    prisma.expenseCategory.findMany({
      where: { organizationId },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.expenseRule.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      select: { id: true, keyword: true, category: { select: { name: true } } },
    }),
    prisma.project.findMany({
      where: { organizationId, status: { not: "COMPLETED" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.expense.aggregate({ where, _sum: { amount: true }, _count: { _all: true } }),
    prisma.expense.aggregate({
      where: { organizationId, date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    getCurrencySymbol(organizationId),
  ]);

  const t = (await getT()).expenses;

  const expenses: ExpenseRow[] = rows.map((e) => ({
    id: e.id,
    vendor: e.vendor,
    amount: Number(e.amount),
    date: e.date.toISOString(),
    categoryId: e.categoryId,
    categoryName: e.category?.name ?? null,
    projectId: e.projectId,
    projectName: e.project?.name ?? null,
    note: e.note,
    receiptUrl: e.receiptUrl,
  }));

  const filteredTotal = Number(filteredAgg._sum.amount ?? 0);
  const filteredCount = filteredAgg._count._all;
  const monthTotal = Number(monthAgg._sum.amount ?? 0);
  const filtering = Boolean(query) || Boolean(categoryId) || range !== "all";

  const rules: RuleRow[] = ruleRows.map((r) => ({
    id: r.id,
    keyword: r.keyword,
    categoryName: r.category.name,
  }));

  // Flag likely data-entry issues across the shown expenses (duplicates +
  // per-category outliers), for inline badges and a review banner.
  const anomalyMap = detectExpenseAnomalies(
    expenses.map((e) => ({
      id: e.id,
      vendor: e.vendor,
      amount: e.amount,
      date: e.date,
      categoryId: e.categoryId,
    }))
  );
  const anomalies: Record<string, AnomalyReason> = Object.fromEntries(anomalyMap);
  const anomalyCount = anomalyMap.size;

  // Filter/search links stay on the combined Costs page, carrying the tab.
  function href(next: { category?: string | null; range?: ExpenseRange }) {
    const p = new URLSearchParams();
    p.set("view", "expenses");
    if (query) p.set("q", query);
    const cat = next.category === undefined ? categoryId : next.category ?? undefined;
    if (cat) p.set("category", cat);
    const r = next.range ?? range;
    if (r !== "all") p.set("range", r);
    return `${basePath}?${p.toString()}`;
  }

  const exportHref = (() => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (categoryId) p.set("category", categoryId);
    if (range !== "all") p.set("range", range);
    const qs = p.toString();
    return qs ? `/admin/expenses/export?${qs}` : "/admin/expenses/export";
  })();

  return (
    <>
      <PageHeader
        title={t.title}
        description={t.subtitle}
        action={
          <Button asChild variant="outline" size="sm">
            <a href={exportHref}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t.exportCsv}</span>
            </a>
          </Button>
        }
      />

      <div className="grid animate-fade-up grid-cols-1 gap-3 sm:grid-cols-2">
        <StatTile value={formatMoney(monthTotal, currency)} label={t.thisMonth} />
        <StatTile value={formatMoney(filteredTotal, currency)} label={t.total} />
      </div>

      <form method="get" className="relative">
        <input type="hidden" name="view" value="expenses" />
        {categoryId && <input type="hidden" name="category" value={categoryId} />}
        {range !== "all" && <input type="hidden" name="range" value={range} />}
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
        <Input
          type="search"
          name="q"
          placeholder={t.searchPlaceholder}
          defaultValue={query}
          className="pl-9"
          aria-label={t.searchAria}
        />
      </form>

      {/* Category + date-range filters share one scrollable row. */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip href={href({ category: null })} active={!categoryId}>
          {t.filterAll}
        </FilterChip>
        {categories.map((c) => (
          <FilterChip key={c.id} href={href({ category: c.id })} active={categoryId === c.id}>
            {c.name}
          </FilterChip>
        ))}
        <span className="mx-0.5 h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-800" aria-hidden="true" />
        {(["all", "month", "week"] as ExpenseRange[]).map((r) => (
          <FilterChip key={r} href={href({ range: r })} active={range === r}>
            {r === "all" ? t.rangeAll : r === "month" ? t.rangeMonth : t.rangeWeek}
          </FilterChip>
        ))}
      </div>

      {(query || categoryId || range !== "all") && expenses.length > 0 && (
        <p className="px-1 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {(filteredCount === 1 ? t.countOne : t.countMany).replace("{n}", String(filteredCount))}
          <span className="normal-case text-neutral-400 dark:text-neutral-500">
            {" · "}
            {formatMoney(filteredTotal, currency)}
          </span>
        </p>
      )}

      {anomalyCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300/50 bg-amber-50 px-4 py-2.5 text-sm dark:border-amber-800/50 dark:bg-amber-950/40">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="font-medium text-amber-800 dark:text-amber-200">
            {(anomalyCount === 1 ? t.reviewOne : t.reviewMany).replace("{n}", String(anomalyCount))}
          </span>
        </div>
      )}

      <ExpensesManager
        expenses={expenses}
        categories={categories}
        projects={projects}
        rules={rules}
        anomalies={anomalies}
        currency={currency}
        filtering={filtering}
      />
    </>
  );
}
