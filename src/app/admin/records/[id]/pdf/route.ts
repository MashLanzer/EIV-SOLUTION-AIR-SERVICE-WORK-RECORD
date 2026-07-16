import { NextResponse } from "next/server";

import { requireOrgId } from "@/lib/orgScope";
import { requireOfficeAccess } from "@/lib/authz";
import { companyForPdf, fetchRecordWithPhotos, recordPdfResponse } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session } = await requireOfficeAccess();
  const organizationId = requireOrgId(session);

  const record = await fetchRecordWithPhotos(id, organizationId);
  if (!record) {
    return new NextResponse("Not found", { status: 404 });
  }

  return recordPdfResponse(record, await companyForPdf(organizationId));
}
