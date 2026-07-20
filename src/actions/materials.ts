"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";

const MAX_NAME = 120;
const MAX_UNIT = 24;

// Read + validate the catalog material fields. Returns null when the required
// fields (name, non-negative unit cost) are missing/invalid.
function readMaterialFields(formData: FormData) {
  const name = ((formData.get("name") as string | null) ?? "").trim().slice(0, MAX_NAME);
  const unitCost = Number.parseFloat((formData.get("unitCost") as string | null) ?? "");
  if (!name || !Number.isFinite(unitCost) || unitCost < 0) return null;
  const unit = ((formData.get("unit") as string | null) ?? "").trim().slice(0, MAX_UNIT) || null;
  return { name, unit, unitCost: unitCost.toFixed(2) };
}

// ---- Catalog --------------------------------------------------------------

export async function createMaterialAction(formData: FormData) {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);
  const fields = readMaterialFields(formData);
  if (!fields) return;

  // Name is unique per org; fold a duplicate into an update rather than error.
  await prisma.material.upsert({
    where: { organizationId_name: { organizationId, name: fields.name } },
    update: { unit: fields.unit, unitCost: fields.unitCost },
    create: { organizationId, ...fields },
  });
  revalidatePath("/admin/materials");
}

export async function updateMaterialAction(id: string, formData: FormData) {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);
  const existing = await prisma.material.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!existing) return;

  const fields = readMaterialFields(formData);
  if (!fields) return;

  // Guard the unique(org,name): if the new name collides with a different row,
  // keep the old name rather than throwing.
  const clash = await prisma.material.findFirst({
    where: { organizationId, name: fields.name, id: { not: existing.id } },
    select: { id: true },
  });
  await prisma.material.update({
    where: { id: existing.id },
    data: clash ? { unit: fields.unit, unitCost: fields.unitCost } : fields,
  });
  revalidatePath("/admin/materials");
}

export async function deleteMaterialAction(id: string) {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);
  const existing = await prisma.material.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  if (!existing) return;

  // The FK is SET NULL, so lines already on jobs keep their snapshot and just
  // lose the catalog link.
  await prisma.material.delete({ where: { id: existing.id } });
  revalidatePath("/admin/materials");
}

// ---- Per-record material lines --------------------------------------------

export async function addRecordMaterialAction(recordId: string, formData: FormData) {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);
  const record = await prisma.workRecord.findFirst({
    where: { id: recordId, organizationId },
    select: { id: true },
  });
  if (!record) return;

  const quantity = Number.parseFloat((formData.get("quantity") as string | null) ?? "");
  if (!Number.isFinite(quantity) || quantity <= 0) return;

  const rawMaterialId = (formData.get("materialId") as string | null)?.trim() || null;
  let name: string;
  let unitCost: number;
  let materialId: string | null = null;

  if (rawMaterialId) {
    // From the catalog: snapshot the catalog name + unit cost onto the line.
    const mat = await prisma.material.findFirst({
      where: { id: rawMaterialId, organizationId },
      select: { id: true, name: true, unitCost: true },
    });
    if (!mat) return;
    materialId = mat.id;
    name = mat.name;
    unitCost = Number(mat.unitCost);
  } else {
    // A one-off item typed straight onto the job.
    name = ((formData.get("name") as string | null) ?? "").trim().slice(0, MAX_NAME);
    unitCost = Number.parseFloat((formData.get("unitCost") as string | null) ?? "");
    if (!name || !Number.isFinite(unitCost) || unitCost < 0) return;
  }

  await prisma.recordMaterial.create({
    data: {
      recordId: record.id,
      materialId,
      name,
      quantity: quantity.toFixed(2),
      unitCost: unitCost.toFixed(2),
    },
  });
  revalidatePath(`/admin/records/${recordId}`);
  revalidatePath("/admin/financials");
}

export async function removeRecordMaterialAction(id: string) {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);
  // Reach the line only through a record in the caller's org.
  const line = await prisma.recordMaterial.findFirst({
    where: { id, record: { organizationId } },
    select: { id: true, recordId: true },
  });
  if (!line) return;

  await prisma.recordMaterial.delete({ where: { id: line.id } });
  revalidatePath(`/admin/records/${line.recordId}`);
  revalidatePath("/admin/financials");
}
