import Link from "next/link";
import { ChevronDown, FileText, Sheet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { SegmentedNav } from "@/components/ui/segmented-nav";
import { RecordBulkBar } from "@/components/records/RecordBulkBar";
import { RecordsFilterBar } from "@/components/records/RecordsFilterBar";
import { RecordsTable } from "@/components/records/RecordsTable";
import { pageCount, paginationArgs, parsePage } from "@/lib/paginate";
import { prisma } from "@/lib/prisma";
import { buildRecordWhereClause, parseRecordFilterParams } from "@/lib/recordFilters";
import { requireOrgId } from "@/lib/orgScope";
import { requireReviewer } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import { parseSort } from "@/lib/sort";
import { cn } from "@/lib/utils";
import type { Prisma, RecordStatus } from "@prisma/client";

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
  const session = await requireReviewer();
  const organizationId = requireOrgId(session);
  const rawParams = await searchParams;
  const filters = parseRecordFilterParams(rawParams);
  const where = buildRecordWhereClause(filters, organizationId);
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
        reviewNote: true,
        submittedBy: { select: { name: true } },
      },
      orderBy: recordOrderBy(sort, dir),
      ...paginationArgs(page),
    }),
    prisma.user.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  const pages = pageCount(total);
  const activeFilterCount = [
    filters.dateFrom,
    filters.dateTo,
    filters.workerId,
    filters.customerName,
    filters.jobNumber,
    filters.status,
  ].filter(Boolean).length;

  const dict = await getT();
  const t = dict.adminRecords;

  // Quick status chips: one tap to filter by review state, keeping any other
  // active filters. "All" clears just the status.
  const statusChips: { label: string; status?: RecordStatus }[] = [
    { label: t.chipAll },
    { label: t.chipPending, status: "SUBMITTED" },
    { label: t.chipReturned, status: "NEEDS_CHANGES" },
    { label: t.chipApproved, status: "APPROVED" },
  ];
  function chipHref(status?: RecordStatus) {
    const p = new URLSearchParams();
    if (filters.dateFrom) p.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) p.set("dateTo", filters.dateTo);
    if (filters.workerId) p.set("workerId", filters.workerId);
    if (filters.customerName) p.set("customerName", filters.customerName);
    if (filters.jobNumber) p.set("jobNumber", filters.jobNumber);
    if (status) p.set("status", status);
    const qs = p.toString();
    return qs ? `/admin/records?${qs}` : "/admin/records";
  }

  return (
    <div className="flex flex-col gap-4">
      <SegmentedNav
        ariaLabel={dict.nav.dashboard}
        items={[
          { label: dict.nav.dashboard, href: "/admin", active: false },
          { label: dict.nav.records, href: "/admin/records", active: true },
        ]}
      />
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t.allRecords}</h1>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {statusChips.map((chip) => {
          const active = (chip.status ?? undefined) === (filters.status ?? undefined);
          return (
            <Link
              key={chip.label}
              href={chipHref(chip.status)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-transparent bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              {chip.label}
            </Link>
          );
        })}
      </div>

      <Card>
        {/* Always collapsed by default so the filter form stays the compact
            size of the rest of the app - even when the page is reached via a
            filtered link (e.g. the dashboard's "Pending Review" ->
            ?status=SUBMITTED). The count badge signals active filters
            without expanding the whole form; tap to adjust. */}
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden [&::marker]:hidden">
            <span className="flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {t.filters}
              {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4">
            <RecordsFilterBar filters={filters} workers={workers} />
          </div>
        </details>
      </Card>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {(total === 1 ? t.recordCountOne : t.recordCountMany).replace("{n}", String(total))}
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
              title={t.exportPdfTitle}
            >
              <FileText className="h-4 w-4" />
              {t.exportPdf}
            </Button>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              formAction="/admin/records/export/excel"
            >
              <Sheet className="h-4 w-4" />
              {t.exportExcel}
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

        <RecordBulkBar
          pendingIds={records
            .filter((r) => r.status === "SUBMITTED")
            .map((r) => r.id)}
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
