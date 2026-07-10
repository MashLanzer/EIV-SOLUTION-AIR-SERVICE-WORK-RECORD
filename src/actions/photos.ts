"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { projectDetailPaths } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";
import { deleteProjectPhoto } from "@/lib/blob";

// Remove a jobsite photo: org-scoped, deletes the blob then the row. Admins can
// delete any photo; a worker only the ones they took.
export async function deletePhotoAction(photoId: string) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, organizationId },
    select: { id: true, url: true, projectId: true, takenById: true },
  });
  if (!photo) return;

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && photo.takenById !== session.user.id) return;

  await deleteProjectPhoto(photo.url);
  await prisma.photo.delete({ where: { id: photo.id } });
  for (const path of projectDetailPaths(photo.projectId)) revalidatePath(path);
}
