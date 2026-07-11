import Link from "next/link";
import type { WorkRecord } from "@prisma/client";
import { ChevronRight, ClipboardList, Eye, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ApproveRecordButton } from "@/components/records/ApproveRecordButton";
import { DeleteRecordButton } from "@/components/records/DeleteRecordButton";
import { RequestChangesButton } from "@/components/records/RequestChangesButton";
import { StatusBadge } from "@/components/records/StatusBadge";
import { MobileCardList } from "@/components/ui/responsive-table";
import { SortHeader } from "@/components/ui/sort-header";
import type { SortDir } from "@/lib/sort";

type RecordWithWorker = Pick<
  WorkRecord,
  "id" | "date" | "jobNumber" | "customerName" | "typeOfWork" | "status" | "reviewNote"
> & { submittedBy: { name: string } | null };

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
  sort,
  dir,
  sortParams,
}: {
  records: RecordWithWorker[];
  exportFormId: string;
  sort: string;
  dir: SortDir;
  sortParams?: Record<string, string | undefined>;
}) {
  const sortProps = { sort, dir, basePath: "/admin/records", params: sortParams };
  if (records.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No records match these filters"
        description="Try adjusting or clearing the filters above."
        action={
          <Button asChild variant="outline" className="mt-2">
            <Link href="/admin/records">Clear filters</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="hidden sm:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SelectAllCheckbox formId={exportFormId} />
                  </TableHead>
                  <TableHead>
                    <SortHeader column="date" label="Date" {...sortProps} />
                  </TableHead>
                  <TableHead>
                    <SortHeader column="jobNumber" label="Job #" {...sortProps} />
                  </TableHead>
                  <TableHead>
                    <SortHeader column="status" label="Status" {...sortProps} />
                  </TableHead>
                  <TableHead>
                    <SortHeader column="customerName" label="Customer" {...sortProps} />
                  </TableHead>
                  <TableHead>
                    <SortHeader column="worker" label="Submitted By" {...sortProps} />
                  </TableHead>
                  <TableHead>
                    <SortHeader column="typeOfWork" label="Type of Work" {...sortProps} />
                  </TableHead>
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
                    <TableCell className="tabular-nums">{formatDate(record.date)}</TableCell>
                    <TableCell className="tabular-nums">{record.jobNumber}</TableCell>
                    <TableCell>
                      <StatusBadge status={record.status} />
                    </TableCell>
                    <TableCell>
                      {record.customerName}
                      {record.status === "NEEDS_CHANGES" && record.reviewNote && (
                        <span className="mt-0.5 block max-w-[16rem] truncate text-xs text-warning-text" title={record.reviewNote}>
                          Returned: {record.reviewNote}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{record.submittedBy?.name ?? "—"}</TableCell>
                    <TableCell>{record.typeOfWork}</TableCell>
                    <TableCell className="flex justify-end gap-2 text-right">
                      <Button asChild variant="outline" size="icon">
                        <Link href={`/admin/records/${record.id}`} aria-label="Review record">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {record.status === "SUBMITTED" && (
                        <>
                          <ApproveRecordButton recordId={record.id} iconOnly />
                          <RequestChangesButton recordId={record.id} iconOnly />
                        </>
                      )}
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
          </CardContent>
        </Card>
      </div>

      <MobileCardList>
        {records.map((record) => (
          <Card key={record.id} className="overflow-hidden">
            {/* Whole upper area taps through to the review page. */}
            <Link
              href={`/admin/records/${record.id}`}
              className="flex items-start gap-3 p-4 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    Job #{record.jobNumber}
                  </span>
                  <StatusBadge status={record.status} />
                </div>
                <div className="mt-0.5 truncate text-sm text-neutral-900 dark:text-neutral-100">
                  {record.customerName}
                </div>
                <div className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                  {formatDate(record.date)} · {record.typeOfWork}
                </div>
                <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {record.submittedBy?.name ?? "—"}
                </div>
                {record.status === "NEEDS_CHANGES" && record.reviewNote && (
                  <p className="mt-1.5 text-xs text-warning-text">
                    <span className="font-medium">Returned:</span> {record.reviewNote}
                  </p>
                )}
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
            </Link>
            <div className="flex justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800 px-4 py-3">
              {record.status === "SUBMITTED" && (
                <>
                  <ApproveRecordButton recordId={record.id} iconOnly />
                  <RequestChangesButton recordId={record.id} iconOnly />
                </>
              )}
              <Button asChild variant="outline" size="icon">
                <a href={`/admin/records/${record.id}/pdf`} aria-label="Download PDF">
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <DeleteRecordButton recordId={record.id} />
            </div>
          </Card>
        ))}
      </MobileCardList>
    </>
  );
}
