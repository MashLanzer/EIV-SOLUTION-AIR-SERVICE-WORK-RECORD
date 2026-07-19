import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { companyForPdf, renderRecordsPdf } from "@/lib/pdf";
import { buildWorkerRecordWhere } from "@/lib/workerRecordExport";

export const runtime = "nodejs";

// Each record is a rendered PDF page; keep the document bounded.
const MAX_PDF_RECORDS = 300;

// Worker-scoped PDF export of the worker's own records, honoring the My Records
// filters. Always limited to submittedById === the caller.
export async function GET(request: Request) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const url = new URL(request.url);
  const where = buildWorkerRecordWhere(url.searchParams, organizationId, session.user.id);

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
      "Content-Disposition": `attachment; filename="my-work-records.pdf"`,
    },
  });
}
