import { NextResponse } from "next/server";

import { getAuditLog } from "@/lib/audit";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";

export const runtime = "nodejs";

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

// Streams the audit trail as a CSV, honoring the same search + type filter as
// the page so "what you see is what you export".
export async function GET(request: Request) {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);

  const sp = new URL(request.url).searchParams;
  const query = sp.get("q")?.trim() || undefined;
  const type = sp.get("type")?.trim() || undefined;

  const events = await getAuditLog(organizationId, { type, query, take: 5000 });

  const headers = ["When", "Actor", "Type", "Action", "Summary"];
  const lines = [headers.map(csvCell).join(",")];
  for (const e of events) {
    lines.push(
      [
        csvCell(e.createdAt.toISOString()),
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
      "Content-Disposition": `attachment; filename="audit-log-${today}.csv"`,
    },
  });
}
