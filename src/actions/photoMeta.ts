"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { canAccessProject, photoDetailPaths } from "@/lib/projectAccess";
import { requireAdmin, requireAuth } from "@/lib/session";

function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 30);
}

// Photo lookup scoped to the caller's org, returning its projectId so we can
// revalidate the detail page.
async function ownedPhoto(photoId: string, organizationId: string) {
  return prisma.photo.findFirst({
    where: { id: photoId, organizationId },
    select: { id: true, projectId: true },
  });
}

function revalidatePhoto(projectId: string, photoId: string) {
  for (const path of photoDetailPaths(projectId, photoId)) revalidatePath(path);
}

// Tags organize the whole company's photos, so only admins edit them; workers
// see them read-only.
export async function addTagAction(photoId: string, formData: FormData) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const photo = await ownedPhoto(photoId, organizationId);
  if (!photo) return;

  const name = normalizeTag((formData.get("name") as string | null) ?? "");
  if (!name) return;

  // Reuse an existing tag of this name in the org, or create it.
  const tag = await prisma.tag.upsert({
    where: { organizationId_name: { organizationId, name } },
    update: {},
    create: { organizationId, name },
    select: { id: true },
  });

  await prisma.photoTag.upsert({
    where: { photoId_tagId: { photoId, tagId: tag.id } },
    update: {},
    create: { photoId, tagId: tag.id },
  });

  revalidatePhoto(photo.projectId, photoId);
}

export async function removeTagAction(photoId: string, tagId: string) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const photo = await ownedPhoto(photoId, organizationId);
  if (!photo) return;

  await prisma.photoTag.deleteMany({ where: { photoId, tagId } });
  revalidatePhoto(photo.projectId, photoId);
}

// Commenting is collaboration - workers can comment, but only on a project
// their team is assigned to.
export async function addCommentAction(photoId: string, formData: FormData) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const photo = await ownedPhoto(photoId, organizationId);
  if (!photo) return;
  if (!(await canAccessProject(session, photo.projectId))) return;

  const body = ((formData.get("body") as string | null) ?? "").trim().slice(0, 2000);
  if (!body) return;

  await prisma.comment.create({
    data: {
      organizationId,
      photoId,
      authorId: session.user.id || null,
      body,
    },
  });
  revalidatePhoto(photo.projectId, photoId);
}

// Delete a comment: its author or any admin, within the org.
export async function deleteCommentAction(commentId: string) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const comment = await prisma.comment.findFirst({
    where: { id: commentId, organizationId },
    select: { id: true, authorId: true, photoId: true, photo: { select: { projectId: true } } },
  });
  if (!comment) return;

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && comment.authorId !== session.user.id) return;

  await prisma.comment.delete({ where: { id: comment.id } });
  revalidatePhoto(comment.photo.projectId, comment.photoId);
}
