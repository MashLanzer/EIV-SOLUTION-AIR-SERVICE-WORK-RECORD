import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { buildWorkbook } from "@/lib/excel";
import { buildRecordWhereClause, parseRecordFilterParams } from "@/lib/recordFilters";

export const runtime = "nodejs";

const MAX_EXCEL_RECORDS = 2000;

export async function GET(request: Request) {
  const session = await requireAdmin();

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
  const where = buildRecordWhereClause(filters, requireOrgId(session));

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

  const buffer = await buildWorkbook(records);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="work-records.xlsx"`,
    },
  });
}
