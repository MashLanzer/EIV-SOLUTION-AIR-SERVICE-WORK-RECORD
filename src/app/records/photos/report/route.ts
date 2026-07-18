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
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";

export const runtime = "nodejs";

// A photo report for the worker feed's current filters, scoped to the worker's
// own team projects (admins viewing the worker app see everything).
export async function GET(request: Request) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const sp = new URL(request.url).searchParams;

  const tag = sp.get("tag")?.trim().toLowerCase() || null;
  const project = sp.get("project")?.trim() || null;
  const source = normalizePhotoSource(sp.get("source") ?? undefined);
  const range = normalizePhotoRange(sp.get("range") ?? undefined);
  const untagged = sp.get("untagged") === "1";
  const mine = sp.get("mine") === "1";
  const cutoff = photoRangeCutoff(range);

  const isAdmin = session.user.role === "ADMIN";
  const teamIds = isAdmin ? null : await getWorkerTeamIds(session.user.id);
  const projectScope: Prisma.PhotoWhereInput = isAdmin
    ? {}
    : { project: { teamId: { in: teamIds ?? [] } } };

  const where: Prisma.PhotoWhereInput = {
    organizationId,
    ...projectScope,
    ...(mine ? { takenById: session.user.id } : {}),
    ...(project ? { projectId: project } : {}),
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
