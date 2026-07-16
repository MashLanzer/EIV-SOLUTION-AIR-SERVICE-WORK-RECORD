import { NextResponse } from "next/server";

import type { ReportGroup, ReportPhoto } from "@/components/pdf/PhotoReportPdfDocument";
import { renderPhotoReportPdf } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";

export const runtime = "nodejs";

// A downloadable "before / after" photo report for a project. Photos tagged
// "before" or "after" are grouped into those sections; everything else falls
// under "Photos". Optional ?tag= narrows the report to one tag.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requirePermission("projects.manage");
  const organizationId = requireOrgId(session);

  const project = await prisma.project.findFirst({
    where: { id, organizationId },
    select: { id: true, name: true, address: true },
  });
  if (!project) {
    return new NextResponse("Not found", { status: 404 });
  }

  const tagFilter = new URL(request.url).searchParams.get("tag")?.trim().toLowerCase() || null;

  const [org, photoRows] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    prisma.photo.findMany({
      where: {
        organizationId,
        projectId: id,
        ...(tagFilter ? { photoTags: { some: { tag: { name: tagFilter } } } } : {}),
      },
      orderBy: { takenAt: "asc" },
      select: {
        id: true,
        url: true,
        takenAt: true,
        takenBy: { select: { name: true } },
        photoTags: { include: { tag: { select: { name: true } } } },
      },
    }),
  ]);

  const photos: ReportPhoto[] = photoRows.map((p) => ({
    id: p.id,
    url: p.url,
    takenAt: p.takenAt,
    takenByName: p.takenBy?.name ?? null,
    tags: p.photoTags.map((pt) => pt.tag.name),
  }));

  // Partition into Before / After / Photos. A photo lands in the first bucket
  // whose tag it carries, so it never appears twice.
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
    { title: tagFilter ? `#${tagFilter}` : "Photos", photos: rest },
  ];

  const buffer = await renderPhotoReportPdf({
    orgName: org?.name ?? "Photo Report",
    projectName: project.name,
    projectAddress: project.address,
    generatedAt: new Date(),
    groups,
  });

  const safeName = project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="photo-report-${safeName || "project"}.pdf"`,
    },
  });
}
