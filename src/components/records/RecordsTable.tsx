import Link from "next/link";
import type { WorkRecord } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SelectAllCheckbox } from "@/components/records/SelectAllCheckbox";
import { DeleteRecordButton } from "@/components/records/DeleteRecordButton";

type RecordWithWorker = WorkRecord & { submittedBy: { name: string } };

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function RecordsTable({
  records,
  exportFormId,
}: {
  records: RecordWithWorker[];
  exportFormId: string;
}) {
  if (records.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No records match these filters.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <SelectAllCheckbox formId={exportFormId} />
          </TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Job #</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Submitted By</TableHead>
          <TableHead>Type of Work</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={record.id}>
            <TableCell>
              <input
                type="checkbox"
                name="ids"
                value={record.id}
                form={exportFormId}
                aria-label={`Select record ${record.jobNumber}`}
              />
            </TableCell>
            <TableCell>{formatDate(record.date)}</TableCell>
            <TableCell>{record.jobNumber}</TableCell>
            <TableCell>{record.customerName}</TableCell>
            <TableCell>{record.submittedBy.name}</TableCell>
            <TableCell>{record.typeOfWork}</TableCell>
            <TableCell className="flex justify-end gap-2 text-right">
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/records/${record.id}`}>Edit</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/records/${record.id}/pdf`}>PDF</Link>
              </Button>
              <DeleteRecordButton recordId={record.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
