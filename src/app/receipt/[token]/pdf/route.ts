import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { companyForPdf, renderReceiptPdf } from "@/lib/pdf";
import { getLocale, getT } from "@/lib/i18n/server";

export const runtime = "nodejs";

// Public: the customer's printable receipt, reachable only via the record's
// unguessable (and optionally expiring) publicToken. No auth - same access
// rules as the on-screen receipt.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const record = await prisma.workRecord.findFirst({
    where: { publicToken: token },
    include: { photos: { orderBy: { position: "asc" } } },
  });
  if (!record || !record.organizationId) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (record.publicTokenExpiresAt && record.publicTokenExpiresAt.getTime() < Date.now()) {
    return new NextResponse("Gone", { status: 410 });
  }

  const t = (await getT()).receipt;
  const locale = await getLocale();
  const company = await companyForPdf(record.organizationId);
  const buffer = await renderReceiptPdf(
    record,
    company,
    {
      title: t.title,
      job: t.job,
      date: t.date,
      customer: t.customer,
      address: t.address,
      typeOfWork: t.typeOfWork,
      time: t.time,
      performedBy: t.performedBy,
      workPerformed: t.workPerformed,
      photos: t.photos,
      customerSignature: t.customerSignature,
      footer: t.footer,
    },
    locale
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="receipt-${record.jobNumber}.pdf"`,
    },
  });
}
