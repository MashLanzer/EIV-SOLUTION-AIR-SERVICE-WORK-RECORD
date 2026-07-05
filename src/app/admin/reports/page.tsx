import { BarChart3, Sheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataField } from "@/components/ui/data-field";
import { DatePresets } from "@/components/ui/date-presets";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterActions, FilterBar, FilterField } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { MobileCardList, MobileCardRow } from "@/components/ui/responsive-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildPayReport, parsePayReportParams } from "@/lib/payReport";
import { requireAdmin } from "@/lib/session";

function money(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>;
}) {
  await requireAdmin();
  const { dateFrom, dateTo } = parsePayReportParams(await searchParams);
  const report = await buildPayReport({ dateFrom, dateTo });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Pay Report</h1>

      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <FilterBar>
            <div className="col-span-2 sm:col-span-6">
              <DatePresets />
            </div>
            <FilterField label="From" htmlFor="dateFrom">
              <Input id="dateFrom" name="dateFrom" type="date" defaultValue={dateFrom} />
            </FilterField>
            <FilterField label="To" htmlFor="dateTo">
              <Input id="dateTo" name="dateTo" type="date" defaultValue={dateTo} />
            </FilterField>
            <FilterActions>
              <Button type="submit" variant="outline" size="default">
                Apply
              </Button>
              <Button
                type="submit"
                variant="outline"
                size="default"
                formAction="/admin/reports/export"
              >
                <Sheet className="h-4 w-4" />
                Export to Excel
              </Button>
            </FilterActions>
          </FilterBar>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Pay by Person ({report.recordCount} approved record
            {report.recordCount === 1 ? "" : "s"})
          </CardTitle>
          <CardDescription>
            Records still pending review or returned for changes aren&apos;t
            counted until they&apos;re approved.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {report.rows.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No records in this range"
              description="Adjust the date range to see pay totals."
            />
          ) : (
            <>
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Jobs</TableHead>
                      <TableHead className="text-right">Lead Pay</TableHead>
                      <TableHead className="text-right">Helper Pay</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.rows.map((row) => (
                      <TableRow key={row.name.toLowerCase()}>
                        <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                          {row.name}
                        </TableCell>
                        <TableCell>{row.jobs}</TableCell>
                        <TableCell className="text-right">
                          {money(row.leadTotal)}
                        </TableCell>
                        <TableCell className="text-right">
                          {money(row.helperTotal)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-neutral-900 dark:text-neutral-100">
                          {money(row.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-neutral-50 dark:bg-neutral-800">
                      <TableCell className="font-semibold text-neutral-900 dark:text-neutral-100">
                        Grand Total
                      </TableCell>
                      <TableCell className="font-semibold">
                        {report.grand.jobs}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {money(report.grand.leadTotal)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {money(report.grand.helperTotal)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-neutral-900 dark:text-neutral-100">
                        {money(report.grand.total)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 p-4 sm:hidden">
                <MobileCardList>
                  {report.rows.map((row) => (
                    <MobileCardRow key={row.name.toLowerCase()}>
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {row.name}
                      </span>
                      <div className="grid grid-cols-2 gap-3">
                        <DataField label="Jobs" value={row.jobs} />
                        <DataField label="Total" value={money(row.total)} />
                        <DataField label="Lead Pay" value={money(row.leadTotal)} />
                        <DataField label="Helper Pay" value={money(row.helperTotal)} />
                      </div>
                    </MobileCardRow>
                  ))}
                </MobileCardList>

                <div className="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 p-4">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                    Grand Total ({report.grand.jobs} jobs)
                  </span>
                  <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {money(report.grand.total)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
