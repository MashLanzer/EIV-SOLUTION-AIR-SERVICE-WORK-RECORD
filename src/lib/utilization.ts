import { prisma } from "@/lib/prisma";
import {
  addUtcDays,
  monthRange,
  spanHours,
  startOfUtcDay,
  utcDay,
  weekRange,
} from "@/lib/schedule";

export type UtilPeriod = "week" | "month";
export type UtilGroup = "person" | "team";

export interface UtilizationRow {
  id: string;
  name: string;
  plannedHours: number;
  loggedHours: number;
}

export interface UtilTrendPoint {
  from: Date;
  plannedHours: number;
  loggedHours: number;
}

export interface UtilizationReport {
  from: Date; // start of the selected period (UTC)
  to: Date; // exclusive end of the selected period (UTC)
  period: UtilPeriod;
  group: UtilGroup;
  rows: UtilizationRow[];
  totals: { plannedHours: number; loggedHours: number };
  trend: UtilTrendPoint[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Number of trailing periods (including the selected one) drawn in the trend.
const TREND_WEEKS = 8;
const TREND_MONTHS = 6;

// The [from, to) range for the period that contains `date`.
export function periodRange(date: Date, period: UtilPeriod) {
  return period === "month" ? monthRange(date) : weekRange(date);
}

// Shift a date by whole periods (used for prev/next nav and trend buckets).
export function shiftPeriod(date: Date, period: UtilPeriod, by: number): Date {
  if (period === "month") {
    return utcDay(date.getUTCFullYear(), date.getUTCMonth() + by, 1);
  }
  return addUtcDays(startOfUtcDay(date), by * 7);
}

// Planned vs logged hours for the period (week or month) containing
// `anyDateInPeriod`, grouped by person or by team. Planned = timed scheduled
// jobs assigned to a worker; logged = hours from work records they submitted.
// Team grouping partitions each worker into a single bucket (their first team,
// or "No team"), so planned and logged stay consistent with the person view -
// just aggregated. A trailing trend of totals accompanies the rows.
export async function getUtilization(
  organizationId: string,
  anyDateInPeriod: Date,
  opts: { period?: UtilPeriod; group?: UtilGroup } = {}
): Promise<UtilizationReport> {
  const period = opts.period ?? "week";
  const group = opts.group ?? "person";
  const { from, to } = periodRange(anyDateInPeriod, period);

  // The trend spans the trailing N periods ending with the selected one.
  const trendCount = period === "month" ? TREND_MONTHS : TREND_WEEKS;
  const trendStart = periodRange(shiftPeriod(from, period, -(trendCount - 1)), period).from;

  const [users, memberships, jobs, records] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId, active: true },
      select: { id: true, name: true },
    }),
    prisma.teamMembership.findMany({
      where: { team: { organizationId } },
      select: { userId: true, team: { select: { id: true, name: true } } },
      orderBy: { team: { name: "asc" } },
    }),
    prisma.scheduledJob.findMany({
      where: {
        organizationId,
        assignedToId: { not: null },
        status: { not: "CANCELED" },
        scheduledFor: { gte: trendStart, lt: to },
      },
      select: { assignedToId: true, scheduledFor: true, startTime: true, endTime: true },
    }),
    prisma.workRecord.findMany({
      where: {
        organizationId,
        submittedById: { not: null },
        date: { gte: trendStart, lt: to },
      },
      select: { submittedById: true, date: true, arrivalTime: true, departureTime: true },
    }),
  ]);

  // Each worker's single bucket: their first team (alphabetical) or "No team".
  const NO_TEAM = "__none__";
  const userBucket = new Map<string, { id: string; name: string }>();
  for (const m of memberships) {
    if (!userBucket.has(m.userId)) {
      userBucket.set(m.userId, { id: m.team.id, name: m.team.name });
    }
  }
  const bucketFor = (userId: string): { id: string; name: string } =>
    group === "team"
      ? userBucket.get(userId) ?? { id: NO_TEAM, name: NO_TEAM }
      : { id: userId, name: users.find((u) => u.id === userId)?.name ?? "—" };

  // Whether an event's date falls inside the selected period.
  const inSelected = (d: Date) => d >= from && d < to;

  const planned = new Map<string, number>();
  const logged = new Map<string, number>();
  const trendPlanned = new Map<number, number>();
  const trendLogged = new Map<number, number>();

  // Which trend bucket (0..trendCount-1) a date belongs to, or -1 if outside.
  const trendPoints = Array.from({ length: trendCount }, (_, i) =>
    periodRange(shiftPeriod(from, period, -(trendCount - 1) + i), period)
  );
  const trendIndex = (d: Date) =>
    trendPoints.findIndex((p) => d >= p.from && d < p.to);

  for (const j of jobs) {
    if (!j.assignedToId) continue;
    const hrs = spanHours(j.startTime, j.endTime);
    if (hrs <= 0) continue;
    const ti = trendIndex(j.scheduledFor);
    if (ti >= 0) trendPlanned.set(ti, (trendPlanned.get(ti) ?? 0) + hrs);
    if (inSelected(j.scheduledFor)) {
      const b = bucketFor(j.assignedToId);
      planned.set(b.id, (planned.get(b.id) ?? 0) + hrs);
    }
  }
  for (const r of records) {
    if (!r.submittedById) continue;
    const hrs = spanHours(r.arrivalTime, r.departureTime);
    if (hrs <= 0) continue;
    const ti = trendIndex(r.date);
    if (ti >= 0) trendLogged.set(ti, (trendLogged.get(ti) ?? 0) + hrs);
    if (inSelected(r.date)) {
      const b = bucketFor(r.submittedById);
      logged.set(b.id, (logged.get(b.id) ?? 0) + hrs);
    }
  }

  // Names for the rows: worker names in person view, team names in team view.
  const nameFor = (id: string): string => {
    if (group === "team") {
      if (id === NO_TEAM) return NO_TEAM; // page maps this to a localized label
      for (const b of userBucket.values()) if (b.id === id) return b.name;
      return "—";
    }
    return users.find((u) => u.id === id)?.name ?? "—";
  };

  const ids = new Set<string>([...planned.keys(), ...logged.keys()]);
  const rows: UtilizationRow[] = [...ids]
    .map((id) => ({
      id,
      name: nameFor(id),
      plannedHours: round1(planned.get(id) ?? 0),
      loggedHours: round1(logged.get(id) ?? 0),
    }))
    .filter((r) => r.plannedHours > 0 || r.loggedHours > 0)
    .sort((a, b) => b.loggedHours - a.loggedHours || b.plannedHours - a.plannedHours);

  const totals = rows.reduce(
    (acc, r) => ({
      plannedHours: round1(acc.plannedHours + r.plannedHours),
      loggedHours: round1(acc.loggedHours + r.loggedHours),
    }),
    { plannedHours: 0, loggedHours: 0 }
  );

  const trend: UtilTrendPoint[] = trendPoints.map((p, i) => ({
    from: p.from,
    plannedHours: round1(trendPlanned.get(i) ?? 0),
    loggedHours: round1(trendLogged.get(i) ?? 0),
  }));

  return { from, to, period, group, rows, totals, trend };
}
