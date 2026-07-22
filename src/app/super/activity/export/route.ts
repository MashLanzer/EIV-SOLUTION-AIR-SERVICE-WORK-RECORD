import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/superAdmin";
import { getGlobalAuditLog } from "@/lib/audit";

export const runtime = "nodejs";

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

// Streams the cross-company activity log as CSV. Honors the same "platform
// only" filter as the Activity page's All view (?platform=1).
export async function GET(request: Request) {
  await requireSuperAdmin();

  const platformOnly = new URL(request.url).searchParams.get("platform") === "1";
  const events = await getGlobalAuditLog({ platformOnly, take: 5000 });

  const headers = ["When", "Company", "Scope", "Actor", "Type", "Action", "Summary"];
  const lines = [headers.map(csvCell).join(",")];
  for (const e of events) {
    lines.push(
      [
        csvCell(e.createdAt.toISOString()),
        csvCell(e.organization?.name ?? "—"),
        csvCell(e.isPlatform ? "Platform" : "Company"),
        csvCell(e.actorName),
        csvCell(e.entityType),
        csvCell(e.action),
        csvCell(e.summary),
      ].join(",")
    );
  }
  const csv = "﻿" + lines.join("\r\n") + "\r\n";

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="platform-activity-${today}.csv"`,
    },
  });
}
