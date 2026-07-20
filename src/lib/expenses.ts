import type { Prisma } from "@prisma/client";

export type ExpenseRange = "all" | "month" | "week";

export const EXPENSE_RANGES: ExpenseRange[] = ["all", "month", "week"];

// Local-midnight cutoff for the range chips (week = Monday, month = day 1).
export function expenseRangeCutoff(range: ExpenseRange): Date | undefined {
  if (range === "all") return undefined;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (range === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  else d.setDate(1);
  return d;
}

// Prisma `where` for the admin expenses list: org-scoped, plus an optional
// category ("none" = uncategorized), date range, and a search over vendor/note.
export function buildExpenseWhere(params: {
  organizationId: string;
  q?: string;
  categoryId?: string;
  range: ExpenseRange;
}): Prisma.ExpenseWhereInput {
  const { organizationId, q, categoryId, range } = params;
  const cutoff = expenseRangeCutoff(range);
  return {
    organizationId,
    ...(categoryId
      ? categoryId === "none"
        ? { categoryId: null }
        : { categoryId }
      : {}),
    ...(cutoff ? { date: { gte: cutoff } } : {}),
    ...(q
      ? {
          OR: [
            { vendor: { contains: q, mode: "insensitive" as const } },
            { note: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

// A generic starter set of expense categories a company can add in one tap and
// then rename/extend. Stored as plain names (org-managed), like work types.
export const EXPENSE_STARTER_CATEGORIES = [
  "Materials",
  "Fuel",
  "Permits",
  "Subcontractor",
  "Equipment rental",
  "Tools",
  "Disposal",
  "Other",
];
