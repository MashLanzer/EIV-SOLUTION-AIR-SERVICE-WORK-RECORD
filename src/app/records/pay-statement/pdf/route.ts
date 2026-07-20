import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { companyForPdf, renderPayStatementPdf } from "@/lib/pdf";
import type { PayStatementRow } from "@/components/pdf/PayStatementPdfDocument";
import { workMinutes } from "@/lib/format";
import { getLocale, getT } from "@/lib/i18n/server";

export const runtime = "nodejs";

type Period = "this-month" | "last-month" | "this-year";

// UTC bounds for the chosen period so the statement lines up with how records
// store their date (UTC midnight), independent of the viewer's zone.
function periodBounds(period: Period): { from: Date; to: Date } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (period === "last-month") {
    return { from: new Date(Date.UTC(y, m - 1, 1)), to: new Date(Date.UTC(y, m, 1)) };
  }
  if (period === "this-year") {
    return { from: new Date(Date.UTC(y, 0, 1)), to: new Date(Date.UTC(y + 1, 0, 1)) };
  }
  return { from: new Date(Date.UTC(y, m, 1)), to: new Date(Date.UTC(y, m + 1, 1)) };
}

// A worker's own downloadable pay statement for a period: their APPROVED
// records with hours + lead-installer pay and a total. Always scoped to the
// caller's own submissions.
export async function GET(request: Request) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const raw = new URL(request.url).searchParams.get("period");
  const period: Period =
    raw === "last-month" || raw === "this-year" ? raw : "this-month";
  const { from, to } = periodBounds(period);

  const records = await prisma.workRecord.findMany({
    where: {
      organizationId,
      submittedById: session.user.id,
      status: "APPROVED",
      date: { gte: from, lt: to },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      jobNumber: true,
      customerName: true,
      arrivalTime: true,
      departureTime: true,
      leadInstallerPay: true,
    },
  });

  const locale = await getLocale();
  const t = (await getT()).records;
  const intl = locale === "es" ? "es-ES" : "en-US";
  const dateFmt = new Intl.DateTimeFormat(intl, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const rangeLabel =
    period === "this-year"
      ? String(from.getUTCFullYear())
      : new Intl.DateTimeFormat(intl, { month: "long", year: "numeric", timeZone: "UTC" }).format(from);

  let totalMinutes = 0;
  let totalPay = 0;
  const rows: PayStatementRow[] = records.map((r) => {
    const mins = workMinutes(r.arrivalTime, r.departureTime);
    totalMinutes += mins;
    const pay = Number(r.leadInstallerPay ?? 0);
    totalPay += pay;
    return {
      date: dateFmt.format(r.date),
      jobNumber: r.jobNumber ? `#${r.jobNumber}` : "—",
      customer: r.customerName || "—",
      hours: (mins / 60).toFixed(1),
      pay,
    };
  });

  const company = await companyForPdf(organizationId);
  const buffer = await renderPayStatementPdf(
    rows,
    { hours: (totalMinutes / 60).toFixed(1), pay: totalPay },
    company,
    {
      title: t.stmtTitle,
      worker: t.stmtFor.replace("{name}", session.user.name || session.user.email || ""),
      range: rangeLabel,
      approvedNote: t.stmtApprovedNote,
      colDate: t.stmtColDate,
      colJob: t.stmtColJob,
      colCustomer: t.stmtColCustomer,
      colHours: t.stmtColHours,
      colPay: t.stmtColPay,
      total: t.stmtTotal,
      empty: t.stmtEmpty,
    }
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="pay-statement-${period}.pdf"`,
    },
  });
}
