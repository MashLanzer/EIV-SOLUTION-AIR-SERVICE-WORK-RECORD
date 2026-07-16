import { NextResponse } from "next/server";

import { buildUtilizationWorkbook } from "@/lib/excel";
import { getUtilization, type UtilGroup, type UtilPeriod } from "@/lib/utilization";
import { dayKey, startOfUtcDay } from "@/lib/schedule";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export const runtime = "nodejs";

function parseDate(value: string | null): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return startOfUtcDay(new Date());
}

export async function GET(request: Request) {
  const session = await requirePermission("reports.view");
  const organizationId = requireOrgId(session);

  const url = new URL(request.url);
  const period: UtilPeriod = url.searchParams.get("period") === "month" ? "month" : "week";
  const group: UtilGroup = url.searchParams.get("group") === "team" ? "team" : "person";
  const selected = parseDate(url.searchParams.get("date"));

  const report = await getUtilization(organizationId, selected, { period, group });
  const noTeamLabel = (await getT()).reports.noTeam;
  const buffer = await buildUtilizationWorkbook(report, { group, noTeamLabel });

  const dateKey = dayKey(report.from);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="utilization-${dateKey}.xlsx"`,
    },
  });
}
