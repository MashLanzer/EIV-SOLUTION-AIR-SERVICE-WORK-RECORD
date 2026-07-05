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

export function parsePayReportParams(searchParams: {
  dateFrom?: string;
  dateTo?: string;
}): Required<PayReportParams> {
  // Default to the current month (UTC, matching how record dates are stored)
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return {
    dateFrom: searchParams.dateFrom || first.toISOString().slice(0, 10),
    dateTo: searchParams.dateTo || now.toISOString().slice(0, 10),
  };
}

// People are the free-text lead/helper names on records (a person can be
// lead on one job and helper on another; both count toward the same row).
// Grouping by submittedBy would misattribute helper pay entirely.
//
// Only APPROVED records count toward pay: SUBMITTED/NEEDS_CHANGES haven't
// cleared review, so they shouldn't show up in what's owed to anyone yet.
export async function buildPayReport({ dateFrom, dateTo }: PayReportParams) {
  const where: Prisma.WorkRecordWhereInput = { status: "APPROVED" };
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
