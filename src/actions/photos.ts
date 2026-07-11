"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { projectDetailPaths } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";
import { deleteProjectPhoto } from "@/lib/blob";

// Core delete: org-scoped, deletes the blob then the row, enforcing that a
// worker can only delete photos they took. Returns the project id (or null if
// nothing was deleted) so callers can revalidate/redirect.
async function removePhoto(
  photoId: string,
  session: Awaited<ReturnType<typeof requireAuth>>
): Promise<string | null> {
  const organizationId = requireOrgId(session);
  const photo = await prisma.photo.findFirst({
    where: { id: photoId, organizationId },
    select: { id: true, url: true, projectId: true, takenById: true },
  });
  if (!photo) return null;

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && photo.takenById !== session.user.id) return null;

  await deleteProjectPhoto(photo.url);
  await prisma.photo.delete({ where: { id: photo.id } });
  for (const path of projectDetailPaths(photo.projectId)) revalidatePath(path);
  return photo.projectId;
}

// Delete in place (used by the project photo grid) - revalidate, no redirect.
export async function deletePhotoAction(photoId: string) {
  const session = await requireAuth();
  await removePhoto(photoId, session);
}

// Delete from the photo detail page, then return to the project. basePath is
// whitelisted so the redirect can't be pointed anywhere else.
export async function deletePhotoAndReturnAction(photoId: string, basePath: string) {
  const session = await requireAuth();
  const projectId = await removePhoto(photoId, session);
  const base = basePath === "/records/projects" ? "/records/projects" : "/admin/projects";
  if (projectId) redirect(`${base}/${projectId}`);
}
