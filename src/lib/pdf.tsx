import { renderToBuffer } from "@react-pdf/renderer";
import type { WorkRecord } from "@prisma/client";

import { WorkRecordPdfDocument } from "@/components/pdf/WorkRecordPdfDocument";

type RecordWithWorker = WorkRecord & { submittedBy?: { name: string } };

export async function renderRecordsPdf(records: RecordWithWorker[]) {
  return renderToBuffer(<WorkRecordPdfDocument records={records} />);
}
