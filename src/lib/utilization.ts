import { prisma } from "@/lib/prisma";
import { spanHours, weekRange } from "@/lib/schedule";

export interface UtilizationRow {
  id: string;
  name: string;
  plannedHours: number;
  loggedHours: number;
}

export interface UtilizationReport {
  from: Date; // Monday of the week (UTC)
  rows: UtilizationRow[];
  totals: { plannedHours: number; loggedHours: number };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// Planned vs logged hours per worker for the Monday–Sunday week containing
// `anyDateInWeek`. Planned = timed scheduled jobs assigned to them; logged =
// hours from work records they submitted (by record date). Only workers with
// activity that week appear, busiest (logged) first.
export async function getUtilization(
  organizationId: string,
  anyDateInWeek: Date
): Promise<UtilizationReport> {
  const { from, to } = weekRange(anyDateInWeek);

  const [users, jobs, records] = await Promise.all([
    prisma.user.findMany({
      where: { organizationId, active: true },
      select: { id: true, name: true },
    }),
    prisma.scheduledJob.findMany({
      where: {
        organizationId,
        assignedToId: { not: null },
        status: { not: "CANCELED" },
        scheduledFor: { gte: from, lt: to },
      },
      select: { assignedToId: true, startTime: true, endTime: true },
    }),
    prisma.workRecord.findMany({
      where: {
        organizationId,
        submittedById: { not: null },
        date: { gte: from, lt: to },
      },
      select: { submittedById: true, arrivalTime: true, departureTime: true },
    }),
  ]);

  const planned = new Map<string, number>();
  for (const j of jobs) {
    if (!j.assignedToId) continue;
    planned.set(j.assignedToId, (planned.get(j.assignedToId) ?? 0) + spanHours(j.startTime, j.endTime));
  }
  const logged = new Map<string, number>();
  for (const r of records) {
    if (!r.submittedById) continue;
    logged.set(r.submittedById, (logged.get(r.submittedById) ?? 0) + spanHours(r.arrivalTime, r.departureTime));
  }

  const rows: UtilizationRow[] = users
    .map((u) => ({
      id: u.id,
      name: u.name,
      plannedHours: round1(planned.get(u.id) ?? 0),
      loggedHours: round1(logged.get(u.id) ?? 0),
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

  return { from, rows, totals };
}
