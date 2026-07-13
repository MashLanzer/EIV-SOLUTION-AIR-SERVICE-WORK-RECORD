import { NextResponse } from "next/server";

import { buildPayReport, parsePayReportParams } from "@/lib/payReport";
import { companyForPdf, renderPayReportPdf } from "@/lib/pdf";
import { requireOrgId } from "@/lib/orgScope";
import { requireReviewer } from "@/lib/session";
import { getLocale, getT } from "@/lib/i18n/server";

export const runtime = "nodejs";

function fmtDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export async function GET(request: Request) {
  const session = await requireReviewer();
  const organizationId = requireOrgId(session);

  const { searchParams } = new URL(request.url);
  const { dateFrom, dateTo } = parsePayReportParams({
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  });
  const report = await buildPayReport({ dateFrom, dateTo }, organizationId);

  const t = (await getT()).reports;
  const locale = await getLocale();
  const company = await companyForPdf(organizationId);

  const buffer = await renderPayReportPdf(report.rows, report.grand, company, {
    title: t.title,
    range: `${fmtDate(dateFrom, locale)} – ${fmtDate(dateTo, locale)}`,
    person: t.colPerson,
    jobs: t.colJobs,
    leadPay: t.colLeadPay,
    helperPay: t.colHelperPay,
    total: t.colTotal,
    grandTotal: t.grandTotal,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pay-report-${dateFrom}_${dateTo}.pdf"`,
    },
  });
}
