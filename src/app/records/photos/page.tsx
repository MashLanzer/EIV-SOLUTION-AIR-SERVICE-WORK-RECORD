import { FileDown, Images } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PhotoFeed } from "@/components/photos/PhotoFeed";
import { PhotoFilters, type PhotoRange } from "@/components/photos/PhotoFilters";
import { PhotoMapButton } from "@/components/photos/PhotoMapButton";
import {
  photoRangeCutoff,
  normalizePhotoRange,
  normalizePhotoSource,
  photoSourceWhere,
  derivePhotoSource,
  type PhotoSource,
} from "@/lib/photoFilters";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

const PHOTO_PAGE = 120;
const PHOTO_MAX = 600;

export default async function WorkerPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{
    tag?: string;
    project?: string;
    source?: string;
    range?: string;
    untagged?: string;
    mine?: string;
    n?: string;
  }>;
}) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const { tag, project, source, range, untagged, mine, n } = await searchParams;
  const activeTag = tag?.trim().toLowerCase() || null;
  const activeProject = project?.trim() || null;
  const activeSource = normalizePhotoSource(source);
  const activeRange: PhotoRange = normalizePhotoRange(range);
  const activeUntagged = untagged === "1";
  const activeMine = mine === "1";
  const cutoff = photoRangeCutoff(activeRange);
  const shown = Math.min(Math.max(Number(n) || PHOTO_PAGE, PHOTO_PAGE), PHOTO_MAX);

  const isAdmin = session.user.role === "ADMIN";
  const teamIds = isAdmin ? null : await getWorkerTeamIds(session.user.id);
  // Restrict every photo query to the worker's team projects.
  const projectScope = isAdmin ? {} : { project: { teamId: { in: teamIds ?? [] } } };

  const baseWhere = {
    organizationId,
    ...projectScope,
    ...(activeMine ? { takenById: session.user.id } : {}),
    ...(activeProject ? { projectId: activeProject } : {}),
    ...(cutoff ? { takenAt: { gte: cutoff } } : {}),
    ...(activeUntagged
      ? { photoTags: { none: {} } }
      : activeTag
        ? { photoTags: { some: { tag: { name: activeTag } } } }
        : {}),
  };
  const photoWhere = { ...baseWhere, ...photoSourceWhere(activeSource) };

  const [tags, projects, photoRows, totalPhotos, sourceCounts] = await Promise.all([
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
      where: photoWhere,
      orderBy: { takenAt: "desc" },
      take: shown,
      select: {
        id: true,
        url: true,
        takenAt: true,
        latitude: true,
        longitude: true,
        project: { select: { id: true, name: true } },
        takenBy: { select: { name: true } },
        workRecordId: true,
        photoTags: { select: { tag: { select: { name: true } } } },
        _count: { select: { comments: true, checklistItems: true } },
      },
    }),
    prisma.photo.count({ where: photoWhere }),
    Promise.all([
      prisma.photo.count({ where: { ...baseWhere, ...photoSourceWhere("project") } }),
      prisma.photo.count({ where: { ...baseWhere, ...photoSourceWhere("checklist") } }),
      prisma.photo.count({ where: { ...baseWhere, ...photoSourceWhere("record") } }),
    ]).then(([project, checklist, record]) => ({ project, checklist, record })),
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
    tags: p.photoTags.map((pt) => pt.tag.name),
    tagCount: p.photoTags.length,
    commentCount: p._count.comments,
    source: derivePhotoSource({
      workRecordId: p.workRecordId,
      hasChecklist: p._count.checklistItems > 0,
    }),
  }));

  const sourceLabel: Record<PhotoSource, string> = {
    project: t.sourceProject,
    checklist: t.sourceChecklist,
    record: t.sourceRecord,
  };
  const sourceChips = (["project", "checklist", "record"] as PhotoSource[])
    .filter((s) => sourceCounts[s] > 0)
    .map((s) => ({ value: s, label: sourceLabel[s], count: sourceCounts[s] }));

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
    activeTag ||
      activeProject ||
      activeSource !== "all" ||
      activeUntagged ||
      activeRange !== "all" ||
      activeMine
  );

  const reportParams = new URLSearchParams();
  if (activeTag) reportParams.set("tag", activeTag);
  if (activeProject) reportParams.set("project", activeProject);
  if (activeSource !== "all") reportParams.set("source", activeSource);
  if (activeRange !== "all") reportParams.set("range", activeRange);
  if (activeUntagged) reportParams.set("untagged", "1");
  if (activeMine) reportParams.set("mine", "1");
  const reportHref = `/records/photos/report${reportParams.toString() ? `?${reportParams}` : ""}`;

  const canLoadMore = totalPhotos > photos.length && shown < PHOTO_MAX;
  const moreParams = new URLSearchParams(reportParams);
  moreParams.set("n", String(Math.min(shown + PHOTO_PAGE, PHOTO_MAX)));
  const moreHref = `/records/photos?${moreParams}`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.title}
        description={(totalPhotos === 1 ? t.countOne : t.countMany).replace(
          "{n}",
          String(totalPhotos)
        )}
        action={
          photos.length > 0 ? (
            <Button asChild variant="outline" size="sm">
              <a href={reportHref}>
                <FileDown className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t.exportPdf}</span>
              </a>
            </Button>
          ) : undefined
        }
      />

      <PhotoFilters
        basePath="/records/photos"
        tags={usableTags}
        projects={projects}
        sources={sourceChips}
        activeTag={activeTag}
        activeProject={activeProject}
        activeSource={activeSource === "all" ? null : activeSource}
        activeRange={activeRange}
        activeUntagged={activeUntagged}
        activeMine={activeMine}
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

      {canLoadMore && (
        <div className="flex justify-center pt-1">
          <Button asChild variant="outline" size="sm">
            <a href={moreHref}>{t.loadMore}</a>
          </Button>
        </div>
      )}
    </div>
  );
}
