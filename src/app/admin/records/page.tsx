import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordsFilterBar } from "@/components/records/RecordsFilterBar";
import { RecordsTable } from "@/components/records/RecordsTable";
import { prisma } from "@/lib/prisma";
import { buildRecordWhereClause, parseRecordFilterParams } from "@/lib/recordFilters";

const EXPORT_FORM_ID = "export-form";

export default async function AdminRecordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const filters = parseRecordFilterParams(rawParams);
  const where = buildRecordWhereClause(filters);

  const [records, workers] = await Promise.all([
    prisma.workRecord.findMany({
      where,
      include: { submittedBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">All Work Records</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <RecordsFilterBar filters={filters} workers={workers} />
        </CardContent>
      </Card>

      <form id={EXPORT_FORM_ID} method="GET" className="flex justify-end gap-2">
        <input type="hidden" name="dateFrom" value={filters.dateFrom ?? ""} />
        <input type="hidden" name="dateTo" value={filters.dateTo ?? ""} />
        <input type="hidden" name="workerId" value={filters.workerId ?? ""} />
        <input type="hidden" name="customerName" value={filters.customerName ?? ""} />
        <input type="hidden" name="jobNumber" value={filters.jobNumber ?? ""} />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          formAction="/admin/records/export/pdf"
        >
          Export to PDF
        </Button>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          formAction="/admin/records/export/excel"
        >
          Export to Excel
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          <RecordsTable records={records} exportFormId={EXPORT_FORM_ID} />
        </CardContent>
      </Card>
    </div>
  );
}
