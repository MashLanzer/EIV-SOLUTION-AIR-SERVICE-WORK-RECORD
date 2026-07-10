import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import type { WorkPhoto, WorkRecord } from "@prisma/client";

import {
  PhotoReportPdfDocument,
  type PhotoReportData,
} from "@/components/pdf/PhotoReportPdfDocument";
import { WorkRecordPdfDocument } from "@/components/pdf/WorkRecordPdfDocument";
import { prisma } from "@/lib/prisma";

type RecordWithWorker = WorkRecord & { submittedBy?: { name: string } | null };

export async function renderRecordsPdf(records: RecordWithWorker[]) {
  return renderToBuffer(<WorkRecordPdfDocument records={records} />);
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
  record: WorkRecord & { photos?: WorkPhoto[] }
) {
  const buffer = await renderRecordsPdf([record]);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="job-${record.jobNumber}.pdf"`,
    },
  });
}
