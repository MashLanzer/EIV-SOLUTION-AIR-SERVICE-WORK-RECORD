import type { Prisma } from "@prisma/client";

import type { ReportGroup, ReportPhoto } from "@/components/pdf/PhotoReportPdfDocument";
import { renderPhotoReportPdf } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";

// A photo report built from an arbitrary (already org-scoped) where clause —
// the feed's current filters — rather than a single project. Photos are
// partitioned into Before / After / everything-else by tag, mirroring the
// per-project report. Returns the finished PDF bytes.
export async function buildFeedPhotoReport(params: {
  organizationId: string;
  orgName: string;
  // Heading shown where the per-project report shows the project name.
  title: string;
  where: Prisma.PhotoWhereInput;
}): Promise<Buffer> {
  const rows = await prisma.photo.findMany({
    where: params.where,
    orderBy: { takenAt: "asc" },
    take: 500,
    select: {
      id: true,
      url: true,
      takenAt: true,
      takenBy: { select: { name: true } },
      photoTags: { include: { tag: { select: { name: true } } } },
    },
  });

  const photos: ReportPhoto[] = rows.map((p) => ({
    id: p.id,
    url: p.url,
    takenAt: p.takenAt,
    takenByName: p.takenBy?.name ?? null,
    tags: p.photoTags.map((pt) => pt.tag.name),
  }));

  const before: ReportPhoto[] = [];
  const after: ReportPhoto[] = [];
  const rest: ReportPhoto[] = [];
  for (const photo of photos) {
    if (photo.tags.includes("before")) before.push(photo);
    else if (photo.tags.includes("after")) after.push(photo);
    else rest.push(photo);
  }

  const groups: ReportGroup[] = [
    { title: "Before", photos: before },
    { title: "After", photos: after },
    { title: "Photos", photos: rest },
  ];

  return renderPhotoReportPdf({
    orgName: params.orgName,
    projectName: params.title,
    projectAddress: null,
    generatedAt: new Date(),
    groups,
  });
}
