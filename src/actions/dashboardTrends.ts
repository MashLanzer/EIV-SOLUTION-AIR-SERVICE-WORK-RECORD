"use server";

import { prisma } from "@/lib/prisma";
import { requireOfficeAccess } from "@/lib/authz";
import { requireOrgId } from "@/lib/orgScope";
import { buildPayReport, parsePayReportParams } from "@/lib/payReport";
import { getLocale } from "@/lib/i18n/server";

const WEEKS_BACK = 8;
const TYPE_WINDOW_MONTHS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfWeek(base = new Date()) {
  const diff = (base.getUTCDay() + 6) % 7; // days since Monday
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - diff));
}

function monthsAgo(months: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
}

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export interface DashboardTrendsData {
  weekBuckets: { label: string; value: number }[];
  payData: { label: string; value: number }[];
  typeData: { label: string; value: number }[];
}

// The dashboard's charts, computed on demand when the "trends" disclosure is
// opened. Pulling these heavy aggregations (a full pay report, an 8-week record
// scan and a 12-month groupBy) out of the initial dashboard load keeps the
// first paint cheap — most visits never open this section.
export async function getDashboardTrends(): Promise<DashboardTrendsData> {
  const { session } = await requireOfficeAccess();
  const organizationId = requireOrgId(session);
  const locale = await getLocale();

  const windowStart = new Date(startOfWeek().getTime() - (WEEKS_BACK - 1) * 7 * DAY_MS);

  const [weeklyRecords, typeGroups, payReport] = await Promise.all([
    prisma.workRecord.findMany({
      where: { organizationId, date: { gte: windowStart } },
      select: { date: true },
    }),
    prisma.workRecord.groupBy({
      by: ["typeOfWork"],
      where: { organizationId, date: { gte: monthsAgo(TYPE_WINDOW_MONTHS) } },
      _count: { _all: true },
    }),
    buildPayReport(parsePayReportParams({}), organizationId),
  ]);

  const weekBuckets = Array.from({ length: WEEKS_BACK }, (_, i) => {
    const start = new Date(windowStart.getTime() + i * 7 * DAY_MS);
    return { label: formatDate(start, locale), value: 0 };
  });
  for (const r of weeklyRecords) {
    const idx = Math.floor((r.date.getTime() - windowStart.getTime()) / (7 * DAY_MS));
    if (idx >= 0 && idx < weekBuckets.length) weekBuckets[idx].value += 1;
  }

  const typeData = typeGroups
    .map((g) => ({ label: g.typeOfWork, value: g._count._all }))
    .sort((a, b) => b.value - a.value);

  const payData = payReport.rows
    .slice(0, 6)
    .map((row) => ({ label: row.name, value: Math.round(row.total) }));

  return { weekBuckets, payData, typeData };
}
