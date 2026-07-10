import { notFound } from "next/navigation";

import { PhotoDetailView } from "@/components/photos/PhotoDetailView";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { canAccessProject } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";

export default async function WorkerPhotoDetailPage({
  params,
}: {
  params: Promise<{ id: string; photoId: string }>;
}) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const { id: projectId, photoId } = await params;

  if (!(await canAccessProject(session, projectId))) notFound();

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

  const isAdmin = session.user.role === "ADMIN";

  return (
    <PhotoDetailView
      photo={photo}
      orgTags={[]}
      basePath="/records/projects"
      canManageTags={isAdmin}
      currentUserId={session.user.id}
      isAdmin={isAdmin}
    />
  );
}
