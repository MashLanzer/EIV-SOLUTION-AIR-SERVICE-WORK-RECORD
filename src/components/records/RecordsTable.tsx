import Link from "next/link";
import type { WorkRecord } from "@prisma/client";
import { ClipboardList, Pencil, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
import { StatusBadge } from "@/components/records/StatusBadge";

type RecordWithWorker = Pick<
  WorkRecord,
  "id" | "date" | "jobNumber" | "customerName" | "typeOfWork" | "status"
> & { submittedBy: { name: string } };

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
      <EmptyState
        icon={ClipboardList}
        title="No records match these filters"
        description="Try adjusting or clearing the filters above."
      />
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
          <TableHead>Status</TableHead>
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
            <TableCell>
              <StatusBadge status={record.status} />
            </TableCell>
            <TableCell>{record.customerName}</TableCell>
            <TableCell>{record.submittedBy.name}</TableCell>
            <TableCell>{record.typeOfWork}</TableCell>
            <TableCell className="flex justify-end gap-2 text-right">
              <Button asChild variant="outline" size="icon">
                <Link href={`/admin/records/${record.id}`} aria-label="Edit record">
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="icon">
                <Link href={`/admin/records/${record.id}/pdf`} aria-label="Download PDF">
                  <Download className="h-4 w-4" />
                </Link>
              </Button>
              <DeleteRecordButton recordId={record.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
