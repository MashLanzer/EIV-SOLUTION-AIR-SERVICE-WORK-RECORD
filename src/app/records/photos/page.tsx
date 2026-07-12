import { Images } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PhotoFeed } from "@/components/photos/PhotoFeed";
import { PhotoFilters } from "@/components/photos/PhotoFilters";
import { GeoPhotoMap } from "@/components/projects/GeoPhotoMap";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";

export default async function WorkerPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; project?: string }>;
}) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const { tag, project } = await searchParams;
  const activeTag = tag?.trim().toLowerCase() || null;
  const activeProject = project?.trim() || null;

  const isAdmin = session.user.role === "ADMIN";
  const teamIds = isAdmin ? null : await getWorkerTeamIds(session.user.id);
  // Restrict every photo query to the worker's team projects.
  const projectScope = isAdmin ? {} : { project: { teamId: { in: teamIds ?? [] } } };

  const [tags, projects, photoRows] = await Promise.all([
    prisma.tag.findMany({
      where: {
        organizationId,
        photoTags: { some: { photo: { organizationId, ...projectScope } } },
      },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    prisma.project.findMany({
      where: {
        organizationId,
        photos: { some: {} },
        ...(isAdmin ? {} : { teamId: { in: teamIds ?? [] } }),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.photo.findMany({
      where: {
        organizationId,
        ...projectScope,
        ...(activeProject ? { projectId: activeProject } : {}),
        ...(activeTag ? { photoTags: { some: { tag: { name: activeTag } } } } : {}),
      },
      orderBy: { takenAt: "desc" },
      take: 120,
      select: {
        id: true,
        url: true,
        takenAt: true,
        latitude: true,
        longitude: true,
        project: { select: { id: true, name: true } },
        takenBy: { select: { name: true } },
        _count: { select: { photoTags: true, comments: true } },
      },
    }),
  ]);

  const usableTags = tags.map((t) => ({ name: t.name }));
  const photos = photoRows.map((p) => ({
    id: p.id,
    url: p.url,
    takenAt: p.takenAt.toISOString(),
    projectId: p.project.id,
    projectName: p.project.name,
    takenByName: p.takenBy?.name ?? null,
    hasGps: p.latitude != null,
    tagCount: p._count.photoTags,
    commentCount: p._count.comments,
  }));

  const photoPins = photoRows
    .filter((p) => p.latitude != null && p.longitude != null)
    .map((p) => ({
      id: p.id,
      name: "Photo",
      latitude: p.latitude as number,
      longitude: p.longitude as number,
      kind: "photo" as const,
      thumbnail: p.url,
      subtitle: p.project.name,
      href: `/records/projects/${p.project.id}/photos/${p.id}`,
    }));

  const isFiltered = Boolean(activeTag || activeProject);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Photos</h1>
        <span className="text-sm text-neutral-500 dark:text-neutral-400 tabular-nums">
          {photos.length} photo{photos.length === 1 ? "" : "s"}
        </span>
      </div>

      <PhotoFilters
        basePath="/records/photos"
        tags={usableTags}
        projects={projects}
        activeTag={activeTag}
        activeProject={activeProject}
      />

      {photoPins.length > 0 && (
        <GeoPhotoMap projectPins={[]} photoPins={photoPins} />
      )}

      {photos.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Images}
              title={isFiltered ? "No photos match" : "No photos yet"}
              description={
                isFiltered
                  ? "Try a different tag or project, or clear the filters."
                  : "Photos from your team's projects show up here, newest first."
              }
            />
          </CardContent>
        </Card>
      ) : (
        <PhotoFeed photos={photos} basePath="/records/projects" />
      )}
    </div>
  );
}
