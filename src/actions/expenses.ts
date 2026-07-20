"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { deleteProjectPhoto } from "@/lib/blob";
import { EXPENSE_STARTER_CATEGORIES } from "@/lib/expenses";

const MAX_VENDOR = 120;
const MAX_NOTE = 500;

function revalidate() {
  revalidatePath("/admin/expenses");
  revalidatePath("/admin/financials");
}

// Parse "YYYY-MM-DD" as UTC midnight; fall back to today when unparseable.
function parseDate(raw: string | null): Date {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Read + validate the shared expense fields from a form. Returns null when the
// required fields (vendor, positive amount) are missing/invalid.
async function readFields(formData: FormData, organizationId: string) {
  const vendor = ((formData.get("vendor") as string | null) ?? "").trim().slice(0, MAX_VENDOR);
  const amount = Number.parseFloat((formData.get("amount") as string | null) ?? "");
  if (!vendor || !Number.isFinite(amount) || amount <= 0) return null;

  const rawCategory = (formData.get("categoryId") as string | null)?.trim() || null;
  const rawProject = (formData.get("projectId") as string | null)?.trim() || null;
  const note = ((formData.get("note") as string | null) ?? "").trim().slice(0, MAX_NOTE) || null;
  const receiptUrl = (formData.get("receiptUrl") as string | null)?.trim() || null;

  // Only link a category/project that belongs to the caller's org.
  const categoryId = rawCategory
    ? (await prisma.expenseCategory.findFirst({
        where: { id: rawCategory, organizationId },
        select: { id: true },
      }))?.id ?? null
    : null;
  const projectId = rawProject
    ? (await prisma.project.findFirst({
        where: { id: rawProject, organizationId },
        select: { id: true },
      }))?.id ?? null
    : null;

  return {
    vendor,
    amount: amount.toFixed(2),
    date: parseDate(formData.get("date") as string | null),
    categoryId,
    projectId,
    note,
    receiptUrl,
  };
}

export async function createExpenseAction(formData: FormData) {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);
  const fields = await readFields(formData, organizationId);
  if (!fields) return;

  await prisma.expense.create({
    data: { organizationId, createdById: session.user.id, ...fields },
  });
  revalidate();
}

export async function updateExpenseAction(id: string, formData: FormData) {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);
  const existing = await prisma.expense.findFirst({
    where: { id, organizationId },
    select: { id: true, receiptUrl: true },
  });
  if (!existing) return;

  const fields = await readFields(formData, organizationId);
  if (!fields) return;

  await prisma.expense.update({ where: { id: existing.id }, data: fields });
  // Drop the old receipt blob when it was replaced or cleared.
  if (existing.receiptUrl && existing.receiptUrl !== fields.receiptUrl) {
    await deleteProjectPhoto(existing.receiptUrl);
  }
  revalidate();
}

export async function deleteExpenseAction(id: string) {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);
  const existing = await prisma.expense.findFirst({
    where: { id, organizationId },
    select: { id: true, receiptUrl: true },
  });
  if (!existing) return;

  await prisma.expense.delete({ where: { id: existing.id } });
  if (existing.receiptUrl) await deleteProjectPhoto(existing.receiptUrl);
  revalidate();
}

// ---- Categories -----------------------------------------------------------

export async function addExpenseCategoryAction(formData: FormData) {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);
  const name = ((formData.get("name") as string | null) ?? "").trim().slice(0, 60);
  if (!name) return;

  const count = await prisma.expenseCategory.count({ where: { organizationId } });
  await prisma.expenseCategory.upsert({
    where: { organizationId_name: { organizationId, name } },
    update: {},
    create: { organizationId, name, position: count },
  });
  revalidate();
}

export async function deleteExpenseCategoryAction(id: string) {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);
  const cat = await prisma.expenseCategory.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!cat) return;
  // The FK is SET NULL, so expenses keep their history and just lose the tag.
  await prisma.expenseCategory.delete({ where: { id: cat.id } });
  revalidate();
}

// Seed the starter set for a company that has no categories yet.
export async function addStarterExpenseCategoriesAction() {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);
  const existing = await prisma.expenseCategory.count({ where: { organizationId } });
  if (existing > 0) return;
  await prisma.expenseCategory.createMany({
    data: EXPENSE_STARTER_CATEGORIES.map((name, position) => ({
      organizationId,
      name,
      position,
    })),
    skipDuplicates: true,
  });
  revalidate();
}
