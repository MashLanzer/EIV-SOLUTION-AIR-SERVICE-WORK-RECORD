import { FileDown, Images } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTabs } from "@/components/layout/SectionTabs";
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
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

// Feed page size + a hard cap on how far "Load more" can grow it.
const PHOTO_PAGE = 120;
const PHOTO_MAX = 600;

export default async function AdminPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{
    tag?: string;
    project?: string;
    by?: string;
    source?: string;
    range?: string;
    untagged?: string;
    n?: string;
  }>;
}) {
  const session = await requirePermission("projects.manage");
  const organizationId = requireOrgId(session);
  const t = (await getT()).photos;
  const { tag, project, by, source, range, untagged, n } = await searchParams;
  const activeTag = tag?.trim().toLowerCase() || null;
  const activeProject = project?.trim() || null;
  const activePhotographer = by?.trim() || null;
  const activeSource = normalizePhotoSource(source);
  const activeRange: PhotoRange = normalizePhotoRange(range);
  const activeUntagged = untagged === "1";
  const cutoff = photoRangeCutoff(activeRange);
  // How many to show; grows via "Load more". Clamped so a hand-edited ?n= can't
  // pull the whole library at once.
  const shown = Math.min(Math.max(Number(n) || PHOTO_PAGE, PHOTO_PAGE), PHOTO_MAX);

  // Everything except the source filter, so the source-chip counts reflect the
  // other active filters but still show every category.
  const baseWhere = {
    organizationId,
    ...(activeProject ? { projectId: activeProject } : {}),
    ...(activePhotographer ? { takenById: activePhotographer } : {}),
    ...(cutoff ? { takenAt: { gte: cutoff } } : {}),
    ...(activeUntagged
      ? { photoTags: { none: {} } }
      : activeTag
        ? { photoTags: { some: { tag: { name: activeTag } } } }
        : {}),
  };
  const photoWhere = { ...baseWhere, ...photoSourceWhere(activeSource) };

  const [tags, projects, photographers, photoRows, totalPhotos, sourceCounts] = await Promise.all([
    prisma.tag.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { name: true, _count: { select: { photoTags: true } } },
    }),
    prisma.project.findMany({
      where: { organizationId, photos: { some: {} } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { organizationId, photosTaken: { some: {} } },
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
    // Per-source counts (respecting the other filters) for the category chips.
    Promise.all([
      prisma.photo.count({ where: { ...baseWhere, ...photoSourceWhere("project") } }),
      prisma.photo.count({ where: { ...baseWhere, ...photoSourceWhere("checklist") } }),
      prisma.photo.count({ where: { ...baseWhere, ...photoSourceWhere("record") } }),
    ]).then(([project, checklist, record]) => ({ project, checklist, record })),
  ]);

  const usableTags = tags
    .filter((t) => t._count.photoTags > 0)
    .map((t) => ({ name: t.name, count: t._count.photoTags }));

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

  // Category chips: only sources that actually have photos (given other filters).
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
      href: `/admin/projects/${p.project.id}/photos/${p.id}`,
    }));

  const isFiltered = Boolean(
    activeTag ||
      activeProject ||
      activePhotographer ||
      activeSource !== "all" ||
      activeUntagged ||
      activeRange !== "all"
  );

  // A PDF of the current view (respects every active filter).
  const reportParams = new URLSearchParams();
  if (activeTag) reportParams.set("tag", activeTag);
  if (activeProject) reportParams.set("project", activeProject);
  if (activePhotographer) reportParams.set("by", activePhotographer);
  if (activeSource !== "all") reportParams.set("source", activeSource);
  if (activeRange !== "all") reportParams.set("range", activeRange);
  if (activeUntagged) reportParams.set("untagged", "1");
  const reportHref = `/admin/photos/report${reportParams.toString() ? `?${reportParams}` : ""}`;

  // "Load more" grows the page by one more batch, keeping the filters.
  const canLoadMore = totalPhotos > photos.length && shown < PHOTO_MAX;
  const moreParams = new URLSearchParams(reportParams);
  moreParams.set("n", String(Math.min(shown + PHOTO_PAGE, PHOTO_MAX)));
  const moreHref = `/admin/photos?${moreParams}`;

  return (
    <div className="flex flex-col gap-4">
      <SectionTabs family="structure" />
      <PageHeader
        title={t.title}
        action={
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-500 dark:text-neutral-400 tabular-nums">
              {(totalPhotos === 1 ? t.countOne : t.countMany).replace("{n}", String(totalPhotos))}
            </span>
            {totalPhotos > 0 && (
              <Button asChild variant="outline" size="sm">
                <a href={reportHref}>
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.exportPdf}</span>
                </a>
              </Button>
            )}
          </div>
        }
      />

      {/* The feed shows the newest 120; be honest when there are more. */}
      {totalPhotos > photos.length && (
        <p className="-mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          {t.showingLatest
            .replace("{shown}", String(photos.length))
            .replace("{total}", String(totalPhotos))}
        </p>
      )}

      <PhotoFilters
        basePath="/admin/photos"
        tags={usableTags}
        projects={projects}
        photographers={photographers.map((p) => ({ id: p.id, name: p.name }))}
        sources={sourceChips}
        activeTag={activeTag}
        activeProject={activeProject}
        activePhotographer={activePhotographer}
        activeSource={activeSource === "all" ? null : activeSource}
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
              description={isFiltered ? t.tryDifferent : t.adminFeedHint}
            />
          </CardContent>
        </Card>
      ) : (
        <PhotoFeed
          photos={photos}
          basePath="/admin/projects"
          canTag
          tagSuggestions={usableTags.map((tg) => tg.name)}
        />
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
