import { redirect } from "next/navigation";

// Expenses now live inside the unified Costs page (Expenses + Budgets behind
// one money sub-nav tab). Keep this path working for bookmarks and deep links
// by forwarding the filters to ?view=expenses.
export default async function AdminExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; range?: string }>;
}) {
  const { q, category, range } = await searchParams;
  const p = new URLSearchParams({ view: "expenses" });
  if (q?.trim()) p.set("q", q.trim());
  if (category) p.set("category", category);
  if (range && range !== "all") p.set("range", range);
  redirect(`/admin/costs?${p.toString()}`);
}
