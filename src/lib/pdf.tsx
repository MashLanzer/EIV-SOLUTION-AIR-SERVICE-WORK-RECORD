import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import type { WorkPhoto, WorkRecord } from "@prisma/client";

import { WorkRecordPdfDocument } from "@/components/pdf/WorkRecordPdfDocument";
import { prisma } from "@/lib/prisma";

type RecordWithWorker = WorkRecord & { submittedBy?: { name: string } | null };

export async function renderRecordsPdf(records: RecordWithWorker[]) {
  return renderToBuffer(<WorkRecordPdfDocument records={records} />);
}

// Shared by the admin and worker single-record PDF routes, which differ
// only in their authorization check.
export function fetchRecordWithPhotos(id: string) {
  return prisma.workRecord.findUnique({
    where: { id },
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
