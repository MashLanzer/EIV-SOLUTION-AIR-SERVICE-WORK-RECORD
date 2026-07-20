import { redirect } from "next/navigation";

// Budgets now live inside the unified Costs page (Expenses + Budgets behind one
// money sub-nav tab). Keep this path working for bookmarks and deep links.
export default function AdminBudgetsPage() {
  redirect("/admin/costs?view=budgets");
}
