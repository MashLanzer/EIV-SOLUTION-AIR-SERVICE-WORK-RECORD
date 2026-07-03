import ExcelJS from "exceljs";
import type { WorkRecord } from "@prisma/client";

type RecordWithWorker = WorkRecord & { submittedBy?: { name: string } };

export async function buildWorkbook(records: RecordWithWorker[]) {
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

  sheet.getColumn("leadInstallerPay").numFmt = '"$"#,##0.00';
  sheet.getColumn("helperPay").numFmt = '"$"#,##0.00';

  return workbook.xlsx.writeBuffer();
}
