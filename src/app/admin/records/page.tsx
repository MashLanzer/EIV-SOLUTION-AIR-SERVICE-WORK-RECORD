import { FileText, Sheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { RecordsFilterBar } from "@/components/records/RecordsFilterBar";
import { RecordsTable } from "@/components/records/RecordsTable";
import { pageCount, paginationArgs, parsePage } from "@/lib/paginate";
import { prisma } from "@/lib/prisma";
import { buildRecordWhereClause, parseRecordFilterParams } from "@/lib/recordFilters";
import { parseSort } from "@/lib/sort";
import type { Prisma } from "@prisma/client";

const EXPORT_FORM_ID = "export-form";

const RECORD_SORTS = [
  "date",
  "jobNumber",
  "customerName",
  "status",
  "typeOfWork",
  "worker",
] as const;

function recordOrderBy(
  sort: (typeof RECORD_SORTS)[number],
  dir: "asc" | "desc"
): Prisma.WorkRecordOrderByWithRelationInput {
  switch (sort) {
    case "jobNumber":
      return { jobNumber: dir };
    case "customerName":
      return { customerName: dir };
    case "status":
      return { status: dir };
    case "typeOfWork":
      return { typeOfWork: dir };
    case "worker":
      return { submittedBy: { name: dir } };
    default:
      return { date: dir };
  }
}

export default async function AdminRecordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const filters = parseRecordFilterParams(rawParams);
  const where = buildRecordWhereClause(filters);
  const page = parsePage(rawParams.page);
  const { sort, dir } = parseSort(rawParams.sort, rawParams.dir, RECORD_SORTS, {
    sort: "date",
    dir: "desc",
  });

  const [total, records, workers] = await Promise.all([
    prisma.workRecord.count({ where }),
    prisma.workRecord.findMany({
      where,
      // Keep signature/photo payloads out of the list query
      select: {
        id: true,
        date: true,
        jobNumber: true,
        customerName: true,
        typeOfWork: true,
        status: true,
        submittedBy: { select: { name: true } },
      },
      orderBy: recordOrderBy(sort, dir),
      ...paginationArgs(page),
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const pages = pageCount(total);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">All Work Records</h1>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <RecordsFilterBar filters={filters} workers={workers} />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {total} Record{total === 1 ? "" : "s"}
          </h2>
          <form id={EXPORT_FORM_ID} method="GET" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="dateFrom" value={filters.dateFrom ?? ""} />
            <input type="hidden" name="dateTo" value={filters.dateTo ?? ""} />
            <input type="hidden" name="workerId" value={filters.workerId ?? ""} />
            <input type="hidden" name="customerName" value={filters.customerName ?? ""} />
            <input type="hidden" name="jobNumber" value={filters.jobNumber ?? ""} />
            <input type="hidden" name="status" value={filters.status ?? ""} />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              formAction="/admin/records/export/pdf"
              title="Bulk PDF exports don't include work photos"
            >
              <FileText className="h-4 w-4" />
              Export to PDF
            </Button>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              formAction="/admin/records/export/excel"
            >
              <Sheet className="h-4 w-4" />
              Export to Excel
            </Button>
          </form>
        </div>

        <RecordsTable
          records={records}
          exportFormId={EXPORT_FORM_ID}
          sort={sort}
          dir={dir}
          sortParams={{
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            workerId: filters.workerId,
            customerName: filters.customerName,
            jobNumber: filters.jobNumber,
            status: filters.status,
          }}
        />

        <Pagination
          page={page}
          pageCount={pages}
          basePath="/admin/records"
          params={{
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            workerId: filters.workerId,
            customerName: filters.customerName,
            jobNumber: filters.jobNumber,
            status: filters.status,
            sort,
            dir,
          }}
        />
      </section>
    </div>
  );
}
