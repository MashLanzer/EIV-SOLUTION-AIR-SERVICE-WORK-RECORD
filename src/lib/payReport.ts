import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface PayReportParams {
  dateFrom?: string;
  dateTo?: string;
}

export interface PayReportRow {
  // Display casing of the first occurrence; rows are folded together
  // case-insensitively on the trimmed name.
  name: string;
  jobs: number;
  leadTotal: number;
  helperTotal: number;
  total: number;
}

// Default to the current month (UTC, matching how record dates are stored)
export function defaultPayReportRange(): Required<PayReportParams> {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return {
    dateFrom: first.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  };
}

export function parsePayReportParams(searchParams: {
  dateFrom?: string;
  dateTo?: string;
}): Required<PayReportParams> {
  const def = defaultPayReportRange();
  return {
    dateFrom: searchParams.dateFrom || def.dateFrom,
    dateTo: searchParams.dateTo || def.dateTo,
  };
}

// People are the free-text lead/helper names on records (a person can be
// lead on one job and helper on another; both count toward the same row).
// Grouping by submittedBy would misattribute helper pay entirely.
//
// Only APPROVED records count toward pay: SUBMITTED/NEEDS_CHANGES haven't
// cleared review, so they shouldn't show up in what's owed to anyone yet.
export async function buildPayReport(
  { dateFrom, dateTo }: PayReportParams,
  organizationId: string
) {
  const where: Prisma.WorkRecordWhereInput = { status: "APPROVED", organizationId };
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }

  const records = await prisma.workRecord.findMany({
    where,
    select: {
      leadInstallerName: true,
      helperName: true,
      leadInstallerPay: true,
      helperPay: true,
    },
  });

  const rows = new Map<string, PayReportRow>();
  const rowFor = (rawName: string) => {
    const name = rawName.trim();
    const key = name.toLowerCase();
    let row = rows.get(key);
    if (!row) {
      row = { name, jobs: 0, leadTotal: 0, helperTotal: 0, total: 0 };
      rows.set(key, row);
    }
    return row;
  };

  for (const record of records) {
    const lead = rowFor(record.leadInstallerName);
    lead.jobs += 1;
    lead.leadTotal += Number(record.leadInstallerPay);

    if (record.helperName?.trim() && record.helperPay != null) {
      const helper = rowFor(record.helperName);
      helper.jobs += 1;
      helper.helperTotal += Number(record.helperPay);
    }
  }

  const sorted = [...rows.values()]
    .map((row) => ({ ...row, total: row.leadTotal + row.helperTotal }))
    .sort((a, b) => b.total - a.total);

  const grand = sorted.reduce(
    (acc, row) => ({
      jobs: acc.jobs + row.jobs,
      leadTotal: acc.leadTotal + row.leadTotal,
      helperTotal: acc.helperTotal + row.helperTotal,
      total: acc.total + row.total,
    }),
    { jobs: 0, leadTotal: 0, helperTotal: 0, total: 0 }
  );

  return { rows: sorted, grand, recordCount: records.length };
}

export interface PayBreakdownLine {
  recordId: string;
  date: string; // ISO (YYYY-MM-DD)
  jobNumber: string;
  customerName: string;
  role: "lead" | "helper";
  pay: number;
}

// The per-job breakdown behind one person's pay-report row: every APPROVED
// record in the range where this name appears as lead or helper, with the
// amount for that role. A record can produce two lines if the same name is
// both lead and helper on it (rare, but the totals must still add up).
export async function buildWorkerPayBreakdown(
  { dateFrom, dateTo, name }: PayReportParams & { name: string },
  organizationId: string
) {
  const trimmed = name.trim();
  const where: Prisma.WorkRecordWhereInput = {
    status: "APPROVED",
    organizationId,
    OR: [
      { leadInstallerName: { equals: trimmed, mode: "insensitive" } },
      { helperName: { equals: trimmed, mode: "insensitive" } },
    ],
  };
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }

  const records = await prisma.workRecord.findMany({
    where,
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      jobNumber: true,
      customerName: true,
      leadInstallerName: true,
      helperName: true,
      leadInstallerPay: true,
      helperPay: true,
    },
  });

  const key = trimmed.toLowerCase();
  const lines: PayBreakdownLine[] = [];
  let leadTotal = 0;
  let helperTotal = 0;
  for (const r of records) {
    const iso = r.date.toISOString().slice(0, 10);
    if (r.leadInstallerName.trim().toLowerCase() === key) {
      const pay = Number(r.leadInstallerPay);
      leadTotal += pay;
      lines.push({
        recordId: r.id,
        date: iso,
        jobNumber: r.jobNumber,
        customerName: r.customerName,
        role: "lead",
        pay,
      });
    }
    if (r.helperName?.trim().toLowerCase() === key && r.helperPay != null) {
      const pay = Number(r.helperPay);
      helperTotal += pay;
      lines.push({
        recordId: r.id,
        date: iso,
        jobNumber: r.jobNumber,
        customerName: r.customerName,
        role: "helper",
        pay,
      });
    }
  }

  const total = leadTotal + helperTotal;
  return {
    name: trimmed,
    lines,
    jobs: lines.length,
    leadTotal,
    helperTotal,
    total,
    avgPerJob: lines.length > 0 ? total / lines.length : 0,
  };
}
