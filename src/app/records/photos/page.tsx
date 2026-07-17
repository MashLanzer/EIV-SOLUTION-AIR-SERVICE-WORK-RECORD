import { FileDown, Images } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PhotoFeed } from "@/components/photos/PhotoFeed";
import { PhotoFilters, type PhotoRange } from "@/components/photos/PhotoFilters";
import { PhotoMapButton } from "@/components/photos/PhotoMapButton";
import { photoRangeCutoff, normalizePhotoRange } from "@/lib/photoFilters";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

export default async function WorkerPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{
    tag?: string;
    project?: string;
    range?: string;
    untagged?: string;
  }>;
}) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const { tag, project, range, untagged } = await searchParams;
  const activeTag = tag?.trim().toLowerCase() || null;
  const activeProject = project?.trim() || null;
  const activeRange: PhotoRange = normalizePhotoRange(range);
  const activeUntagged = untagged === "1";
  const cutoff = photoRangeCutoff(activeRange);

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
        ...(cutoff ? { takenAt: { gte: cutoff } } : {}),
        ...(activeUntagged
          ? { photoTags: { none: {} } }
          : activeTag
            ? { photoTags: { some: { tag: { name: activeTag } } } }
            : {}),
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

  const t = (await getT()).photos;
  const usableTags = tags.map((tag) => ({ name: tag.name }));
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
      name: t.photoPinLabel,
      latitude: p.latitude as number,
      longitude: p.longitude as number,
      kind: "photo" as const,
      thumbnail: p.url,
      subtitle: p.project.name,
      href: `/records/projects/${p.project.id}/photos/${p.id}`,
    }));

  const isFiltered = Boolean(
    activeTag || activeProject || activeUntagged || activeRange !== "all"
  );

  const reportParams = new URLSearchParams();
  if (activeTag) reportParams.set("tag", activeTag);
  if (activeProject) reportParams.set("project", activeProject);
  if (activeRange !== "all") reportParams.set("range", activeRange);
  if (activeUntagged) reportParams.set("untagged", "1");
  const reportHref = `/records/photos/report${reportParams.toString() ? `?${reportParams}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t.title}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500 dark:text-neutral-400 tabular-nums">
            {(photos.length === 1 ? t.countOne : t.countMany).replace("{n}", String(photos.length))}
          </span>
          {photos.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <a href={reportHref}>
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">{t.exportPdf}</span>
              </a>
            </Button>
          )}
        </div>
      </div>

      <PhotoFilters
        basePath="/records/photos"
        tags={usableTags}
        projects={projects}
        activeTag={activeTag}
        activeProject={activeProject}
        activeRange={activeRange}
        activeUntagged={activeUntagged}
      />

      <PhotoMapButton photoPins={photoPins} />

      {photos.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Images}
              title={isFiltered ? t.noMatch : t.noYet}
              description={isFiltered ? t.tryDifferent : t.feedHint}
            />
          </CardContent>
        </Card>
      ) : (
        <PhotoFeed photos={photos} basePath="/records/projects" />
      )}
    </div>
  );
}
