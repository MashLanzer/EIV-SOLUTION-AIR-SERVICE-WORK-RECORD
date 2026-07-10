"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { deleteProjectPhoto } from "@/lib/blob";

// Remove a jobsite photo: org-scoped, deletes the blob then the row.
export async function deletePhotoAction(photoId: string) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, organizationId },
    select: { id: true, url: true, projectId: true },
  });
  if (!photo) return;

  await deleteProjectPhoto(photo.url);
  await prisma.photo.delete({ where: { id: photo.id } });
  revalidatePath(`/admin/projects/${photo.projectId}`);
}
