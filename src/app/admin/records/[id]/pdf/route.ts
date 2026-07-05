import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/session";
import { fetchRecordWithPhotos, recordPdfResponse } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await requireAdmin();

  const record = await fetchRecordWithPhotos(id);
  if (!record) {
    return new NextResponse("Not found", { status: 404 });
  }

  return recordPdfResponse(record);
}
