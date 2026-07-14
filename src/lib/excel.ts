import ExcelJS from "exceljs";
import type { WorkRecord } from "@prisma/client";

import type { UtilGroup, UtilizationReport } from "@/lib/utilization";

type RecordWithWorker = WorkRecord & { submittedBy?: { name: string } | null };

export async function buildWorkbook(records: RecordWithWorker[], currency = "$") {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Work Records");

  sheet.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Job #", key: "jobNumber", width: 12 },
    { header: "Lead Installer", key: "leadInstallerName", width: 20 },
    { header: "Helper", key: "helperName", width: 20 },
    { header: "Customer Name", key: "customerName", width: 24 },
    { header: "Customer Address", key: "customerAddress", width: 30 },
    { header: "Arrival Time", key: "arrivalTime", width: 12 },
    { header: "Departure Time", key: "departureTime", width: 14 },
    { header: "Type of Work", key: "typeOfWork", width: 18 },
    { header: "Work Performed / Notes", key: "workPerformedNotes", width: 40 },
    { header: "Lead Installer Pay", key: "leadInstallerPay", width: 16 },
    { header: "Helper Pay", key: "helperPay", width: 14 },
    { header: "Submitted By", key: "submittedBy", width: 20 },
  ];

  sheet.getRow(1).font = { bold: true };

  for (const record of records) {
    sheet.addRow({
      date: record.date.toISOString().slice(0, 10),
      jobNumber: record.jobNumber,
      leadInstallerName: record.leadInstallerName,
      helperName: record.helperName ?? "",
      customerName: record.customerName,
      customerAddress: record.customerAddress,
      arrivalTime: record.arrivalTime,
      departureTime: record.departureTime,
      typeOfWork: record.typeOfWork,
      workPerformedNotes: record.workPerformedNotes,
      leadInstallerPay: Number(record.leadInstallerPay),
      helperPay: record.helperPay ? Number(record.helperPay) : null,
      submittedBy: record.submittedBy?.name ?? "",
    });
  }

  const moneyFmt = `"${currency}"#,##0.00`;
  sheet.getColumn("leadInstallerPay").numFmt = moneyFmt;
  sheet.getColumn("helperPay").numFmt = moneyFmt;

  return workbook.xlsx.writeBuffer();
}

// Utilization report (planned vs logged hours per person or team) as a
// single-sheet workbook, mirroring what the on-screen table shows plus a
// grand-total row. Percentages are stored as fractions with a % number
// format so they sort and compute correctly in the spreadsheet.
export async function buildUtilizationWorkbook(
  report: UtilizationReport,
  opts: { group: UtilGroup; noTeamLabel?: string }
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Utilization");

  sheet.columns = [
    { header: opts.group === "team" ? "Team" : "Person", key: "name", width: 28 },
    { header: "Planned Hours", key: "planned", width: 16 },
    { header: "Logged Hours", key: "logged", width: 16 },
    { header: "Utilization", key: "pct", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  const pctOf = (planned: number, logged: number): number | null =>
    planned > 0 ? logged / planned : null;

  for (const row of report.rows) {
    const pct = pctOf(row.plannedHours, row.loggedHours);
    sheet.addRow({
      name: row.name === "__none__" ? opts.noTeamLabel ?? "No team" : row.name,
      planned: row.plannedHours,
      logged: row.loggedHours,
      pct: pct == null ? "—" : pct,
    });
  }

  const totalPct = pctOf(report.totals.plannedHours, report.totals.loggedHours);
  const totalRow = sheet.addRow({
    name: "Grand Total",
    planned: report.totals.plannedHours,
    logged: report.totals.loggedHours,
    pct: totalPct == null ? "—" : totalPct,
  });
  totalRow.font = { bold: true };

  sheet.getColumn("pct").numFmt = "0%";

  return workbook.xlsx.writeBuffer();
}
