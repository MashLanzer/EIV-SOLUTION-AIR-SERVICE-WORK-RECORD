import type { Session } from "next-auth";
import type { Prisma, ScheduledJobStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getWorkerTeamIds } from "@/lib/projectAccess";

// The scheduler works in whole calendar days. scheduledFor is a DATE column,
// which Prisma reads/writes at UTC midnight, so every range boundary here is
// built as a UTC midnight too - that keeps "the 14th" the 14th regardless of
// the server's timezone, exactly like WorkRecord.date is handled elsewhere.
export function utcDay(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

// UTC midnight of a given date's calendar day.
export function startOfUtcDay(date: Date): Date {
  return utcDay(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

// Add whole days to a UTC-midnight date.
export function addUtcDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// Stable YYYY-MM-DD key for grouping jobs by day (UTC).
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// The Monday..Sunday week that contains `date` (UTC). Field service weeks read
// most naturally Monday-first, matching the rest of the app's calendars.
export function weekRange(date: Date): { from: Date; to: Date } {
  const start = startOfUtcDay(date);
  // getUTCDay: 0=Sun..6=Sat; shift so Monday is the first column.
  const isoDow = (start.getUTCDay() + 6) % 7; // 0=Mon..6=Sun
  const from = addUtcDays(start, -isoDow);
  const to = addUtcDays(from, 7); // exclusive upper bound
  return { from, to };
}

// The role-scoped filter every scheduler query must go through: an admin sees
// the whole company's calendar; a worker sees only jobs assigned to them
// personally or to one of their teams. Mirrors the project-access rules so the
// two features grant the same visibility.
export async function scheduleWhereForUser(
  session: Session,
  organizationId: string
): Promise<Prisma.ScheduledJobWhereInput> {
  if (session.user.role === "ADMIN") return { organizationId };
  const teamIds = await getWorkerTeamIds(session.user.id);
  return {
    organizationId,
    OR: [
      { assignedToId: session.user.id },
      ...(teamIds.length > 0 ? [{ teamId: { in: teamIds } }] : []),
    ],
  };
}

// The shape the calendar/list UI needs: the job plus the display bits of who's
// assigned, where, and whether it already produced a work record.
const jobInclude = {
  assignedTo: { select: { id: true, name: true } },
  team: { select: { id: true, name: true, color: true } },
  customer: { select: { id: true, name: true, address: true } },
  project: { select: { id: true, name: true, address: true } },
  workRecord: { select: { id: true, jobNumber: true, status: true } },
} satisfies Prisma.ScheduledJobInclude;

export type ScheduledJobRow = Prisma.ScheduledJobGetPayload<{ include: typeof jobInclude }>;

// Fetch jobs in a half-open [from, to) day range, role-scoped. Ordered so the
// calendar reads top-to-bottom by day then by start time (timed jobs first,
// untimed after), which is how a dispatcher scans a day.
export async function getScheduledJobs(params: {
  session: Session;
  organizationId: string;
  from: Date;
  to: Date;
  status?: ScheduledJobStatus;
  assignedToId?: string;
}): Promise<ScheduledJobRow[]> {
  const { session, organizationId, from, to, status, assignedToId } = params;
  const scope = await scheduleWhereForUser(session, organizationId);
  return prisma.scheduledJob.findMany({
    where: {
      ...scope,
      scheduledFor: { gte: from, lt: to },
      ...(status ? { status } : {}),
      ...(assignedToId ? { assignedToId } : {}),
    },
    include: jobInclude,
    orderBy: [{ scheduledFor: "asc" }, { startTime: "asc" }, { createdAt: "asc" }],
  });
}

// Authorization gate for mutating a single job. Admins can touch any job in
// their org; a worker only a job assigned to them or their team (so they can
// start/finish their own visits, but not reassign someone else's).
export async function canAccessJob(
  session: Session,
  jobId: string,
  organizationId: string
): Promise<boolean> {
  const scope = await scheduleWhereForUser(session, organizationId);
  const job = await prisma.scheduledJob.findFirst({
    where: { AND: [{ id: jobId }, scope] },
    select: { id: true },
  });
  return job != null;
}

// The scheduler lives only in the admin area for now; a future worker view can
// add its own path here and mutations will revalidate both.
export function schedulePaths(): string[] {
  return ["/admin/schedule", "/records/schedule"];
}
