import { BarChart3, Sheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePresets } from "@/components/ui/date-presets";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Pay Report</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-col gap-3">
            <DatePresets />
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="dateFrom">From</Label>
                <Input id="dateFrom" name="dateFrom" type="date" defaultValue={dateFrom} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="dateTo">To</Label>
                <Input id="dateTo" name="dateTo" type="date" defaultValue={dateTo} />
              </div>
              <Button type="submit" variant="outline">
                Apply
              </Button>
              <Button
                type="submit"
                variant="outline"
                formAction="/admin/reports/export"
              >
                <Sheet className="h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
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
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                      {row.name}
                    </TableCell>
                    <TableCell>{row.jobs}</TableCell>
                    <TableCell className="text-right">
                      {money(row.leadTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {money(row.helperTotal)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-900 dark:text-slate-100">
                      {money(row.total)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50 dark:bg-slate-800">
                  <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
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
                  <TableCell className="text-right font-semibold text-slate-900 dark:text-slate-100">
                    {money(report.grand.total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
