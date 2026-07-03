import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { renderRecordsPdf } from "@/lib/pdf";
import { buildRecordWhereClause, parseRecordFilterParams } from "@/lib/recordFilters";

export const runtime = "nodejs";

export async function GET(request: Request) {
  await requireAdmin();

  const url = new URL(request.url);
  const filters = parseRecordFilterParams({
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    workerId: url.searchParams.get("workerId") ?? undefined,
    customerName: url.searchParams.get("customerName") ?? undefined,
    jobNumber: url.searchParams.get("jobNumber") ?? undefined,
    ids: url.searchParams.getAll("ids"),
  });
  const where = buildRecordWhereClause(filters);

  const records = await prisma.workRecord.findMany({
    where,
    include: { submittedBy: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  if (records.length === 0) {
    return new NextResponse("No records match these filters", { status: 404 });
  }

  const buffer = await renderRecordsPdf(records);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="work-records.pdf"`,
    },
  });
}
