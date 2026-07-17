import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { buildFeedPhotoReport } from "@/lib/photoReportFeed";
import {
  normalizePhotoRange,
  photoRangeCutoff,
  normalizePhotoSource,
  photoSourceWhere,
} from "@/lib/photoFilters";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";

export const runtime = "nodejs";

// A photo report for the admin feed's current filters (tag / project /
// photographer / date range / untagged) — the feed-level counterpart to the
// per-project report.
export async function GET(request: Request) {
  const session = await requirePermission("projects.manage");
  const organizationId = requireOrgId(session);
  const sp = new URL(request.url).searchParams;

  const tag = sp.get("tag")?.trim().toLowerCase() || null;
  const project = sp.get("project")?.trim() || null;
  const by = sp.get("by")?.trim() || null;
  const source = normalizePhotoSource(sp.get("source") ?? undefined);
  const range = normalizePhotoRange(sp.get("range") ?? undefined);
  const untagged = sp.get("untagged") === "1";
  const cutoff = photoRangeCutoff(range);

  const where: Prisma.PhotoWhereInput = {
    organizationId,
    ...(project ? { projectId: project } : {}),
    ...(by ? { takenById: by } : {}),
    ...photoSourceWhere(source),
    ...(cutoff ? { takenAt: { gte: cutoff } } : {}),
    ...(untagged
      ? { photoTags: { none: {} } }
      : tag
        ? { photoTags: { some: { tag: { name: tag } } } }
        : {}),
  };

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  const buffer = await buildFeedPhotoReport({
    organizationId,
    orgName: org?.name ?? "Photo Report",
    title: "Photos",
    where,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="photo-report.pdf"`,
    },
  });
}
