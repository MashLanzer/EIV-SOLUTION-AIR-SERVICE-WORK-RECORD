import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import type { WorkPhoto, WorkRecord } from "@prisma/client";

import {
  PhotoReportPdfDocument,
  type PhotoReportData,
} from "@/components/pdf/PhotoReportPdfDocument";
import {
  WorkRecordPdfDocument,
  type PdfCompany,
} from "@/components/pdf/WorkRecordPdfDocument";
import { prisma } from "@/lib/prisma";

type RecordWithWorker = WorkRecord & { submittedBy?: { name: string } | null };

// The tenant's own header block for the PDF: name plus any company details
// (phone, address, license) set in Settings. Name falls back to the product
// name if somehow missing. Each company brands its own paperwork.
export async function companyForPdf(organizationId: string): Promise<PdfCompany> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      companyPhone: true,
      companyAddress: true,
      licenseNumber: true,
    },
  });
  return {
    name: org?.name ?? "AeroTrack",
    phone: org?.companyPhone ?? null,
    address: org?.companyAddress ?? null,
    license: org?.licenseNumber ?? null,
  };
}

export async function renderRecordsPdf(records: RecordWithWorker[], company: PdfCompany) {
  return renderToBuffer(<WorkRecordPdfDocument records={records} company={company} />);
}

export async function renderPhotoReportPdf(data: PhotoReportData) {
  return renderToBuffer(<PhotoReportPdfDocument data={data} />);
}

// Shared by the admin and worker single-record PDF routes, which differ
// only in their authorization check. Scoped to the caller's org so one
// company can't render another company's record as a PDF.
export function fetchRecordWithPhotos(id: string, organizationId: string) {
  return prisma.workRecord.findFirst({
    where: { id, organizationId },
    include: { photos: { orderBy: { position: "asc" } } },
  });
}

export async function recordPdfResponse(
  record: WorkRecord & { photos?: WorkPhoto[] },
  company: PdfCompany
) {
  const buffer = await renderRecordsPdf([record], company);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="job-${record.jobNumber}.pdf"`,
    },
  });
}
