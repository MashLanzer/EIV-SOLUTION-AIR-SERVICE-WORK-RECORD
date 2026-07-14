import { NextResponse } from "next/server";

import { companyForPdf, renderUtilizationPdf } from "@/lib/pdf";
import { getUtilization, type UtilGroup, type UtilPeriod } from "@/lib/utilization";
import { dayKey, startOfUtcDay } from "@/lib/schedule";
import { requireOrgId } from "@/lib/orgScope";
import { requireReviewer } from "@/lib/session";
import { getLocale, getT } from "@/lib/i18n/server";

export const runtime = "nodejs";

function parseDate(value: string | null): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return startOfUtcDay(new Date());
}

export async function GET(request: Request) {
  const session = await requireReviewer();
  const organizationId = requireOrgId(session);

  const url = new URL(request.url);
  const period: UtilPeriod = url.searchParams.get("period") === "month" ? "month" : "week";
  const group: UtilGroup = url.searchParams.get("group") === "team" ? "team" : "person";
  const selected = parseDate(url.searchParams.get("date"));

  const report = await getUtilization(organizationId, selected, { period, group });

  const t = (await getT()).reports;
  const locale = await getLocale();
  const intlLocale = locale === "es" ? "es-ES" : "en-US";
  const dayFmt = new Intl.DateTimeFormat(intlLocale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const monthFmt = new Intl.DateTimeFormat(intlLocale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const range =
    period === "month"
      ? t.monthOf.replace("{date}", monthFmt.format(report.from))
      : t.weekOf.replace("{date}", dayFmt.format(report.from));

  const company = await companyForPdf(organizationId);
  const buffer = await renderUtilizationPdf(report, company, {
    title: t.utilizationTitle,
    range,
    name: group === "team" ? t.byTeam : t.colPerson,
    planned: t.plannedHours,
    logged: t.loggedHours,
    utilization: t.utilizationPct,
    grandTotal: t.grandTotal,
    noTeam: t.noTeam,
    hoursSuffix: t.hoursShort,
  });

  const dateKey = dayKey(report.from);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="utilization-${dateKey}.pdf"`,
    },
  });
}
