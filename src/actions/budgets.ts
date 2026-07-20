"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";

// Set (or clear) a category's monthly budget. Blank/invalid clears it.
export async function setCategoryBudgetAction(categoryId: string, formData: FormData) {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);
  const cat = await prisma.expenseCategory.findFirst({
    where: { id: categoryId, organizationId },
    select: { id: true },
  });
  if (!cat) return;

  const raw = (formData.get("monthlyBudget") as string | null)?.trim() ?? "";
  let monthlyBudget: string | null = null;
  if (raw) {
    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n) || n < 0) return;
    monthlyBudget = n.toFixed(2);
  }

  await prisma.expenseCategory.update({ where: { id: cat.id }, data: { monthlyBudget } });
  revalidatePath("/admin/budgets");
  revalidatePath("/admin/expenses");
}
