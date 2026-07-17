"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { requirePermission } from "@/lib/authz";
import { deleteProjectPhoto } from "@/lib/blob";

const FEED_PATHS = ["/admin/photos", "/records/photos"];

function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 30);
}

function cleanIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))].slice(0, 200);
}

// Tag many photos at once (admin — tags are a company-wide taxonomy). Adds the
// tag to every selected photo in the caller's org; already-tagged photos are a
// harmless no-op. Returns how many photos are now tagged.
export async function bulkTagPhotosAction(
  photoIds: string[],
  name: string
): Promise<{ count: number }> {
  const session = await requirePermission("projects.manage");
  const organizationId = requireOrgId(session);
  const ids = cleanIds(photoIds);
  const tagName = normalizeTag(name);
  if (ids.length === 0 || !tagName) return { count: 0 };

  const owned = await prisma.photo.findMany({
    where: { id: { in: ids }, organizationId },
    select: { id: true },
  });
  if (owned.length === 0) return { count: 0 };

  const tag = await prisma.tag.upsert({
    where: { organizationId_name: { organizationId, name: tagName } },
    update: {},
    create: { organizationId, name: tagName },
    select: { id: true },
  });

  await prisma.photoTag.createMany({
    data: owned.map((p) => ({ photoId: p.id, tagId: tag.id })),
    skipDuplicates: true,
  });

  for (const path of FEED_PATHS) revalidatePath(path);
  return { count: owned.length };
}

// Delete many photos at once. Each is org-scoped and honours the same rule as
// the single delete: an admin can delete any, a worker only ones they took.
// Blobs are removed before the rows. Returns how many were actually deleted.
export async function bulkDeletePhotosAction(
  photoIds: string[]
): Promise<{ count: number }> {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const ids = cleanIds(photoIds);
  if (ids.length === 0) return { count: 0 };

  const isAdmin = session.user.role === "ADMIN";
  const photos = await prisma.photo.findMany({
    where: {
      id: { in: ids },
      organizationId,
      ...(isAdmin ? {} : { takenById: session.user.id }),
    },
    select: { id: true, url: true },
  });
  if (photos.length === 0) return { count: 0 };

  for (const p of photos) {
    await deleteProjectPhoto(p.url);
  }
  await prisma.photo.deleteMany({ where: { id: { in: photos.map((p) => p.id) }, organizationId } });

  for (const path of FEED_PATHS) revalidatePath(path);
  return { count: photos.length };
}
