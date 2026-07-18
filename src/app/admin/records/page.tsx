import { ChevronDown, FileText, Sheet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChip } from "@/components/ui/filter-chip";
import { Pagination } from "@/components/ui/pagination";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { RecordBulkBar } from "@/components/records/RecordBulkBar";
import { RecordsFilterBar } from "@/components/records/RecordsFilterBar";
import { RecordsTable } from "@/components/records/RecordsTable";
import { SuccessToast } from "@/components/ui/success-toast";
import { pageCount, paginationArgs, parsePage } from "@/lib/paginate";
import { prisma } from "@/lib/prisma";
import { buildRecordWhereClause, parseRecordFilterParams } from "@/lib/recordFilters";
import { requireOrgId } from "@/lib/orgScope";
import { requireOfficeAccess } from "@/lib/authz";
import { getCurrencySymbol } from "@/lib/currency";
import { formatMoney } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { parseSort } from "@/lib/sort";
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
  const { session } = await requireOfficeAccess();
  const organizationId = requireOrgId(session);
  const rawParams = await searchParams;
  const filters = parseRecordFilterParams(rawParams);
  const where = buildRecordWhereClause(filters, organizationId);
  // Counts for the status chips reflect the other active filters (date, worker,
  // customer…) but ignore the status filter itself, so each chip shows how many
  // records it would land on.
  const whereNoStatus = buildRecordWhereClause({ ...filters, status: undefined }, organizationId);
  const page = parsePage(rawParams.page);
  const { sort, dir } = parseSort(rawParams.sort, rawParams.dir, RECORD_SORTS, {
    sort: "date",
    dir: "desc",
  });

  const [total, records, workers, statusCounts, payTotals, currency] = await Promise.all([
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
        arrivalTime: true,
        departureTime: true,
        submittedBy: { select: { name: true } },
        _count: { select: { photos: true } },
      },
      orderBy: recordOrderBy(sort, dir),
      ...paginationArgs(page),
    }),
    prisma.user.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.workRecord.groupBy({
      by: ["status"],
      where: whereNoStatus,
      _count: { _all: true },
    }),
    // Total pay across the whole filtered set (not just the current page), so
    // the office can read the money for a filter (e.g. a worker in a date
    // range) without exporting.
    prisma.workRecord.aggregate({
      where,
      _sum: { leadInstallerPay: true, helperPay: true },
    }),
    getCurrencySymbol(organizationId),
  ]);
  const totalPay =
    Number(payTotals._sum.leadInstallerPay ?? 0) + Number(payTotals._sum.helperPay ?? 0);
  const countByStatus = new Map<RecordStatus, number>(
    statusCounts.map((s) => [s.status, s._count._all])
  );
  const allCount = statusCounts.reduce((sum, s) => sum + s._count._all, 0);
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
      <SectionTabs family="records" />
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t.allRecords}</h1>
      {rawParams.saved && <SuccessToast message={dict.records.recordSaved} aboveMobileNav />}

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {statusChips.map((chip) => {
          const active = (chip.status ?? undefined) === (filters.status ?? undefined);
          const count = chip.status ? countByStatus.get(chip.status) ?? 0 : allCount;
          return (
            <FilterChip key={chip.label} href={chipHref(chip.status)} active={active} count={count}>
              {chip.label}
            </FilterChip>
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
          <h2 className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            <span>
              {(total === 1 ? t.recordCountOne : t.recordCountMany).replace("{n}", String(total))}
            </span>
            {total > 0 && (
              <span className="flex items-center gap-1 normal-case text-neutral-400 dark:text-neutral-500">
                <span aria-hidden>·</span>
                {t.totalPay}{" "}
                <span className="font-semibold tabular-nums text-neutral-700 dark:text-neutral-200">
                  {formatMoney(totalPay, currency)}
                </span>
              </span>
            )}
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
