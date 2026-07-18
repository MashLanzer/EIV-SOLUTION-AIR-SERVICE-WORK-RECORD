import Link from "next/link";
import type { WorkRecord } from "@prisma/client";
import { ChevronRight, ClipboardList, Clock, Eye, Download, Image as ImageIcon } from "lucide-react";

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
import { workDuration } from "@/lib/format";
import { getLocale, getT } from "@/lib/i18n/server";
import type { SortDir } from "@/lib/sort";

type RecordWithWorker = Pick<
  WorkRecord,
  | "id"
  | "date"
  | "jobNumber"
  | "customerName"
  | "typeOfWork"
  | "status"
  | "reviewNote"
  | "arrivalTime"
  | "departureTime"
> & { submittedBy: { name: string } | null; _count: { photos: number } };

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export async function RecordsTable({
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
  const dict = await getT();
  const t = dict.adminRecords;
  const locale = await getLocale();
  if (records.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={t.noMatch}
        description={t.noMatchDesc}
        action={
          <Button asChild variant="outline" className="mt-2">
            <Link href="/admin/records">{t.clearFilters}</Link>
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
                    <SortHeader column="date" label={dict.records.date} {...sortProps} />
                  </TableHead>
                  <TableHead>
                    <SortHeader column="jobNumber" label={dict.records.jobNumber} {...sortProps} />
                  </TableHead>
                  <TableHead>
                    <SortHeader column="status" label={t.colStatus} {...sortProps} />
                  </TableHead>
                  <TableHead>
                    <SortHeader column="customerName" label={dict.records.customer} {...sortProps} />
                  </TableHead>
                  <TableHead>
                    <SortHeader column="worker" label={t.colSubmittedBy} {...sortProps} />
                  </TableHead>
                  <TableHead>
                    <SortHeader column="typeOfWork" label={dict.records.typeOfWork} {...sortProps} />
                  </TableHead>
                  <TableHead className="text-right">{t.colActions}</TableHead>
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
                        aria-label={t.selectRecord.replace("{n}", record.jobNumber)}
                      />
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDate(record.date, locale)}</TableCell>
                    <TableCell className="tabular-nums">{record.jobNumber}</TableCell>
                    <TableCell>
                      <StatusBadge status={record.status} />
                    </TableCell>
                    <TableCell>
                      {record.customerName}
                      {record.status === "NEEDS_CHANGES" && record.reviewNote && (
                        <span className="mt-0.5 block max-w-[16rem] truncate text-xs text-warning-text" title={record.reviewNote}>
                          {t.returnedPrefix} {record.reviewNote}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{record.submittedBy?.name ?? "—"}</TableCell>
                    <TableCell>{record.typeOfWork}</TableCell>
                    <TableCell className="flex justify-end gap-2 text-right">
                      <Button asChild variant="outline" size="icon">
                        <Link href={`/admin/records/${record.id}`} aria-label={t.reviewRecord}>
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
                        <Link href={`/admin/records/${record.id}/pdf`} aria-label={dict.records.downloadPdf}>
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
              className="flex items-start gap-3 p-3 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
                <ClipboardList className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {dict.records.jobNumber}{record.jobNumber}
                  </span>
                  <StatusBadge status={record.status} />
                </div>
                <div className="mt-0.5 truncate text-sm text-neutral-900 dark:text-neutral-100">
                  {record.customerName}
                </div>
                <div className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                  {formatDate(record.date, locale)} · {record.typeOfWork}
                </div>
                <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {record.submittedBy?.name ?? "—"}
                </div>
                {(() => {
                  const hours = workDuration(record.arrivalTime, record.departureTime);
                  const photos = record._count.photos;
                  if (!hours && photos === 0) return null;
                  return (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {hours && (
                        <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                          <Clock className="h-3 w-3" />
                          <span className="tabular-nums">{hours}</span>
                        </span>
                      )}
                      {photos > 0 && (
                        <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                          <ImageIcon className="h-3 w-3" />
                          <span className="tabular-nums">{photos}</span>
                        </span>
                      )}
                    </div>
                  );
                })()}
                {record.status === "NEEDS_CHANGES" && record.reviewNote && (
                  <p className="mt-1 text-xs text-warning-text">
                    <span className="font-medium">{t.returnedPrefix}</span> {record.reviewNote}
                  </p>
                )}
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
            </Link>
            <div className="flex justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800 px-3 py-2">
              {record.status === "SUBMITTED" && (
                <>
                  <ApproveRecordButton recordId={record.id} iconOnly />
                  <RequestChangesButton recordId={record.id} iconOnly />
                </>
              )}
              <Button asChild variant="outline" size="icon">
                <a href={`/admin/records/${record.id}/pdf`} aria-label={dict.records.downloadPdf}>
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
