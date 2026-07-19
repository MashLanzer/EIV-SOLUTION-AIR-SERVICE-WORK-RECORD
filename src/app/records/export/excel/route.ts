import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";
import { buildWorkbook } from "@/lib/excel";
import { buildWorkerRecordWhere } from "@/lib/workerRecordExport";

export const runtime = "nodejs";

const MAX_EXCEL_RECORDS = 2000;

// Worker-scoped Excel export of the worker's own records, honoring the My
// Records filters. Always limited to submittedById === the caller.
export async function GET(request: Request) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const url = new URL(request.url);
  const where = buildWorkerRecordWhere(url.searchParams, organizationId, session.user.id);

  const total = await prisma.workRecord.count({ where });
  if (total === 0) {
    return new NextResponse("No records match these filters", { status: 404 });
  }
  if (total > MAX_EXCEL_RECORDS) {
    return new NextResponse(
      `This export would contain ${total} records; the Excel limit is ${MAX_EXCEL_RECORDS}. Narrow the filters (e.g. a smaller date range) and try again.`,
      { status: 400 }
    );
  }

  const records = await prisma.workRecord.findMany({
    where,
    include: { submittedBy: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  const currency = await getCurrencySymbol(organizationId);
  const buffer = await buildWorkbook(records, currency);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="my-work-records.xlsx"`,
    },
  });
}
