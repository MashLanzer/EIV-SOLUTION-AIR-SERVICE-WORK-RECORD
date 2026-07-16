import { notFound } from "next/navigation";

import { PhotoDetailView } from "@/components/photos/PhotoDetailView";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";

export default async function PhotoDetailPage({
  params,
}: {
  params: Promise<{ id: string; photoId: string }>;
}) {
  const session = await requirePermission("projects.manage");
  const organizationId = requireOrgId(session);
  const { id: projectId, photoId } = await params;

  const photo = await prisma.photo.findFirst({
    where: { id: photoId, projectId, organizationId },
    include: {
      project: { select: { id: true, name: true } },
      takenBy: { select: { name: true } },
      photoTags: { include: { tag: { select: { id: true, name: true } } } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
    },
  });
  if (!photo) notFound();

  const orgTags = await prisma.tag.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    select: { name: true },
  });

  return (
    <PhotoDetailView
      photo={photo}
      orgTags={orgTags}
      basePath="/admin/projects"
      canManageTags
      currentUserId={session.user.id}
      isAdmin
    />
  );
}
