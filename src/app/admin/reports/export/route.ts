import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

import { buildPayReport, parsePayReportParams } from "@/lib/payReport";
import { getCurrencySymbol } from "@/lib/currency";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await requireAdmin();

  const { searchParams } = new URL(request.url);
  const { dateFrom, dateTo } = parsePayReportParams({
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  });
  const report = await buildPayReport({ dateFrom, dateTo }, requireOrgId(session));
  const currency = await getCurrencySymbol(requireOrgId(session));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pay Report");

  sheet.columns = [
    { header: "Person", key: "name", width: 24 },
    { header: "Jobs", key: "jobs", width: 8 },
    { header: "Lead Pay", key: "leadTotal", width: 14 },
    { header: "Helper Pay", key: "helperTotal", width: 14 },
    { header: "Total", key: "total", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const row of report.rows) {
    sheet.addRow(row);
  }
  const totalRow = sheet.addRow({
    name: "Grand Total",
    jobs: report.grand.jobs,
    leadTotal: report.grand.leadTotal,
    helperTotal: report.grand.helperTotal,
    total: report.grand.total,
  });
  totalRow.font = { bold: true };

  const moneyFmt = `"${currency}"#,##0.00`;
  for (const key of ["leadTotal", "helperTotal", "total"]) {
    sheet.getColumn(key).numFmt = moneyFmt;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pay-report-${dateFrom}-to-${dateTo}.xlsx"`,
    },
  });
}
