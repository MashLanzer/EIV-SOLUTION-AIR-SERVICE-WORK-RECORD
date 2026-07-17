"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { ALL_PERMISSION_KEYS, ACCESS_LEVELS, type AccessLevel } from "@/lib/permissions";

function parseAccessLevel(raw: FormDataEntryValue | null): AccessLevel {
  const v = String(raw ?? "");
  return (ACCESS_LEVELS as readonly string[]).includes(v) ? (v as AccessLevel) : "WORKER";
}

// Only the capability keys from the catalog are stored; anything else is
// dropped, so a stale/injected value can never grant access.
function parsePermissions(formData: FormData): string[] {
  const raw = formData.getAll("perm").map(String);
  return ALL_PERMISSION_KEYS.filter((k) => raw.includes(k));
}

export async function createPositionAction(formData: FormData) {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);

  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) return;
  const color = (String(formData.get("color") ?? "").trim() || null)?.slice(0, 20) ?? null;

  await prisma.position.create({
    data: {
      organizationId,
      name,
      color,
      accessLevel: parseAccessLevel(formData.get("accessLevel")),
      permissions: parsePermissions(formData),
    },
  });
  revalidatePath("/admin/roles");
  redirect("/admin/roles?saved=1");
}

export async function updatePositionAction(positionId: string, formData: FormData) {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);

  const existing = await prisma.position.findFirst({
    where: { id: positionId, organizationId },
    select: { isSystem: true },
  });
  if (!existing) return;

  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!name) return;
  const color = (String(formData.get("color") ?? "").trim() || null)?.slice(0, 20) ?? null;

  await prisma.position.update({
    where: { id: positionId },
    data: {
      name,
      color,
      permissions: parsePermissions(formData),
      // System positions keep their app gate fixed (they mirror the built-in
      // roles); only custom positions can change which app they belong to.
      ...(existing.isSystem ? {} : { accessLevel: parseAccessLevel(formData.get("accessLevel")) }),
    },
  });
  revalidatePath("/admin/roles");
  redirect("/admin/roles?saved=1");
}

// Clone a position as a starting point for a new custom role. The copy is
// always custom (isSystem: false) even when duplicating a built-in role, so
// the original stays intact and the copy is fully editable/deletable.
export async function duplicatePositionAction(positionId: string) {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);

  const src = await prisma.position.findFirst({
    where: { id: positionId, organizationId },
    select: { name: true, color: true, accessLevel: true, permissions: true },
  });
  if (!src) return;

  await prisma.position.create({
    data: {
      organizationId,
      name: `${src.name} (copy)`.slice(0, 60),
      color: src.color,
      accessLevel: src.accessLevel,
      permissions: ALL_PERMISSION_KEYS.filter((k) => src.permissions.includes(k)),
      isSystem: false,
    },
  });
  revalidatePath("/admin/roles");
  redirect("/admin/roles?saved=1");
}

export async function deletePositionAction(positionId: string) {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);

  // System positions can't be deleted (they're the fallback that mirrors the
  // built-in roles). Members' positionId is cleared by the SetNull FK.
  const pos = await prisma.position.findFirst({
    where: { id: positionId, organizationId },
    select: { isSystem: true },
  });
  if (!pos || pos.isSystem) return;

  await prisma.position.delete({ where: { id: positionId } });
  revalidatePath("/admin/roles");
  redirect("/admin/roles");
}

// Assign (or clear, with an empty value) a worker's position. Scoped to the
// org on both the user and the position, so you can't assign another company's.
export async function setWorkerPositionAction(userId: string, formData: FormData) {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);

  const raw = String(formData.get("positionId") ?? "").trim();
  let positionId: string | null = null;
  if (raw) {
    const pos = await prisma.position.findFirst({
      where: { id: raw, organizationId },
      select: { id: true },
    });
    if (!pos) return;
    positionId = pos.id;
  }

  await prisma.user.updateMany({
    where: { id: userId, organizationId },
    data: { positionId },
  });
  revalidatePath(`/admin/workers/${userId}`);
}
