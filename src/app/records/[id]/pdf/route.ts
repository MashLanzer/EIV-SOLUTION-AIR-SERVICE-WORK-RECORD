import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { renderRecordsPdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireAuth();

  const record = await prisma.workRecord.findUnique({
    where: { id },
    include: { photos: { orderBy: { position: "asc" } } },
  });
  if (!record) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (session.user.role !== "ADMIN" && record.submittedById !== session.user.id) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = await renderRecordsPdf([record]);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="job-${record.jobNumber}.pdf"`,
    },
  });
}
