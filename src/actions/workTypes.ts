"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { STARTER_PACKS } from "@/lib/workTypes";

export type WorkTypeState = { error?: string } | undefined;

const MANAGE_PATH = "/admin/settings/work-types";

function clean(value: FormDataEntryValue | null): string {
  return (typeof value === "string" ? value : "").trim();
}

// Add a category (admin, org-scoped). Appends after the current last one.
export async function createWorkTypeCategoryAction(
  _prev: WorkTypeState,
  formData: FormData
): Promise<WorkTypeState> {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);
  const name = clean(formData.get("name"));
  if (!name) return { error: "Enter a category name." };

  const count = await prisma.workTypeCategory.count({ where: { organizationId } });
  try {
    await prisma.workTypeCategory.create({
      data: { organizationId, name, position: count },
    });
  } catch {
    return { error: "That category already exists." };
  }
  revalidatePath(MANAGE_PATH);
  return undefined;
}

export async function deleteWorkTypeCategoryAction(categoryId: string) {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);
  // Org scope guard: only delete a category that belongs to the caller's org.
  await prisma.workTypeCategory.deleteMany({
    where: { id: categoryId, organizationId },
  });
  revalidatePath(MANAGE_PATH);
}

// Add a work type under a category (admin, org-scoped).
export async function createWorkTypeAction(
  categoryId: string,
  _prev: WorkTypeState,
  formData: FormData
): Promise<WorkTypeState> {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);
  const name = clean(formData.get("name"));
  if (!name) return { error: "Enter a work type." };

  const category = await prisma.workTypeCategory.findFirst({
    where: { id: categoryId, organizationId },
    select: { id: true },
  });
  if (!category) return { error: "Category not found." };

  const count = await prisma.workType.count({ where: { categoryId } });
  try {
    await prisma.workType.create({
      data: { organizationId, categoryId, name, position: count },
    });
  } catch {
    return { error: "That work type already exists in this category." };
  }
  revalidatePath(MANAGE_PATH);
  return undefined;
}

export async function deleteWorkTypeAction(workTypeId: string) {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);
  await prisma.workType.deleteMany({
    where: { id: workTypeId, organizationId },
  });
  revalidatePath(MANAGE_PATH);
}

// Seed the org's taxonomy from an industry starter pack (admin). Existing
// categories/items are kept; duplicates are skipped, so packs can be mixed
// and re-applying is safe.
export async function applyStarterPackAction(packId: string) {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);
  const pack = STARTER_PACKS.find((p) => p.id === packId);
  if (!pack) return;

  const base = await prisma.workTypeCategory.count({ where: { organizationId } });
  for (let i = 0; i < pack.categories.length; i++) {
    const cat = pack.categories[i];
    const category = await prisma.workTypeCategory.upsert({
      where: { organizationId_name: { organizationId, name: cat.name } },
      update: {},
      create: { organizationId, name: cat.name, position: base + i },
    });
    await prisma.workType.createMany({
      data: cat.items.map((name, j) => ({
        organizationId,
        categoryId: category.id,
        name,
        position: j,
      })),
      skipDuplicates: true,
    });
  }
  revalidatePath(MANAGE_PATH);
}
