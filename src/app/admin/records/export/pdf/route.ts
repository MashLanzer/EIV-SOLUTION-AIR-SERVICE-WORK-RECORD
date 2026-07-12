import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { companyForPdf, renderRecordsPdf } from "@/lib/pdf";
import { buildRecordWhereClause, parseRecordFilterParams } from "@/lib/recordFilters";

export const runtime = "nodejs";

// Each record is a rendered PDF page; keep the document bounded.
const MAX_PDF_RECORDS = 300;

export async function GET(request: Request) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const url = new URL(request.url);
  const filters = parseRecordFilterParams({
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    workerId: url.searchParams.get("workerId") ?? undefined,
    customerName: url.searchParams.get("customerName") ?? undefined,
    jobNumber: url.searchParams.get("jobNumber") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    ids: url.searchParams.getAll("ids"),
  });
  const where = buildRecordWhereClause(filters, organizationId);

  const total = await prisma.workRecord.count({ where });
  if (total === 0) {
    return new NextResponse("No records match these filters", { status: 404 });
  }
  if (total > MAX_PDF_RECORDS) {
    return new NextResponse(
      `This export would contain ${total} records; the PDF limit is ${MAX_PDF_RECORDS}. Narrow the filters (e.g. a smaller date range) and try again.`,
      { status: 400 }
    );
  }

  const records = await prisma.workRecord.findMany({
    where,
    include: { submittedBy: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  const buffer = await renderRecordsPdf(records, await companyForPdf(organizationId));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="work-records.pdf"`,
    },
  });
}
