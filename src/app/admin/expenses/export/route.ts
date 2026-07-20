import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { buildExpenseWhere, EXPENSE_RANGES, type ExpenseRange } from "@/lib/expenses";

export const runtime = "nodejs";

// Escape a value for CSV: wrap in quotes and double any inner quotes.
function csv(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

// Worker-scoped? No — admin-scoped export of the filtered expenses, honoring the
// same filters as the list (category, range, search).
export async function GET(request: Request) {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);

  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim() || undefined;
  const categoryId = params.get("category") || undefined;
  const rawRange = params.get("range") ?? undefined;
  const range: ExpenseRange = EXPENSE_RANGES.includes(rawRange as ExpenseRange)
    ? (rawRange as ExpenseRange)
    : "all";

  const where = buildExpenseWhere({ organizationId, q: query, categoryId, range });
  const rows = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
    select: {
      date: true,
      vendor: true,
      amount: true,
      note: true,
      category: { select: { name: true } },
      project: { select: { name: true } },
    },
  });

  const header = ["Date", "Vendor", "Category", "Project", "Amount", "Note"];
  const lines = rows.map((r) =>
    [
      r.date.toISOString().slice(0, 10),
      r.vendor,
      r.category?.name ?? "",
      r.project?.name ?? "",
      Number(r.amount).toFixed(2),
      r.note ?? "",
    ]
      .map(csv)
      .join(",")
  );
  const body = [header.map(csv).join(","), ...lines].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expenses.csv"`,
    },
  });
}
