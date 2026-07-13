import { prisma } from "@/lib/prisma";
import { getSkillSuggestions } from "@/lib/orgSkills";
import { addUtcDays, startOfUtcDay, toMinutes, utcDay, weekRange } from "@/lib/schedule";

// Whole hours between two "HH:MM" wall-clock strings, rolling a negative span
// over midnight (an overnight visit). Returns 0 when either time is unparseable.
function spanHours(arrival: string, departure: string): number {
  const a = toMinutes(arrival);
  const d = toMinutes(departure);
  if (a == null || d == null) return 0;
  let diff = d - a;
  if (diff < 0) diff += 24 * 60;
  return diff / 60;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const TREND_WEEKS = 6;

// Everything the profile screen needs for one user, in a single round of
// queries. Shared by the worker and admin profile routes (which differ only in
// role, back link, and the record-link base) so the two pages stay in sync.
export async function getProfileData(userId: string, organizationId: string) {
  const today = startOfUtcDay(new Date());
  const weekEnd = addUtcDays(today, 7);
  // The Monday of the current week, and the start of the 6-week trend window.
  const thisWeekStart = weekRange(today).from;
  const trendStart = addUtcDays(thisWeekStart, -(TREND_WEEKS - 1) * 7);
  const monthStart = utcDay(today.getUTCFullYear(), today.getUTCMonth(), 1);

  const [
    statusCounts,
    teams,
    recentRecords,
    userData,
    upcomingJobs,
    needsAttention,
    trendRecords,
    skillSuggestions,
  ] = await Promise.all([
      prisma.workRecord.groupBy({
        by: ["status"],
        where: { submittedById: userId },
        _count: true,
      }),
      prisma.teamMembership.findMany({
        where: { userId },
        include: { team: { select: { id: true, name: true, color: true } } },
      }),
      prisma.workRecord.findMany({
        where: { submittedById: userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, jobNumber: true, customerName: true, date: true, status: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true, skills: { select: { id: true, name: true } } },
      }),
      // "My week": jobs assigned to me from today through the next 7 days.
      prisma.scheduledJob.findMany({
        where: {
          assignedToId: userId,
          status: { not: "CANCELED" },
          scheduledFor: { gte: today, lt: weekEnd },
        },
        orderBy: [{ scheduledFor: "asc" }, { startTime: "asc" }, { createdAt: "asc" }],
        take: 6,
        select: {
          id: true,
          title: true,
          scheduledFor: true,
          startTime: true,
          endTime: true,
          customer: { select: { name: true } },
          project: { select: { name: true } },
        },
      }),
      // "Needs your attention": records the reviewer sent back to fix.
      prisma.workRecord.findMany({
        where: { submittedById: userId, status: "NEEDS_CHANGES" },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, jobNumber: true, customerName: true, date: true, status: true },
      }),
      // Records over the last 6 weeks, for the hours-this-month figure and the
      // weekly submissions trend.
      prisma.workRecord.findMany({
        where: { submittedById: userId, date: { gte: trendStart } },
        select: { date: true, arrivalTime: true, departureTime: true },
      }),
      // Skill autocomplete: the org catalog plus any free-text skills already in
      // use, so "HVAC" doesn't drift into "A/C", "hvac", etc.
      getSkillSuggestions(organizationId),
    ]);

  const totalRecords = statusCounts.reduce((acc, s) => acc + s._count, 0);
  const approvedRecords = statusCounts.find((s) => s.status === "APPROVED")?._count ?? 0;
  const pendingRecords = statusCounts.find((s) => s.status === "SUBMITTED")?._count ?? 0;

  // Approval rate over all submitted records, hours logged this month, and a
  // per-week submission count for the trend sparkline (oldest week first).
  const approvalRate = totalRecords > 0 ? Math.round((approvedRecords / totalRecords) * 100) : 0;
  let hoursThisMonth = 0;
  const weekly = Array<number>(TREND_WEEKS).fill(0);
  for (const r of trendRecords) {
    if (r.date >= monthStart) hoursThisMonth += spanHours(r.arrivalTime, r.departureTime);
    const recWeekStart = weekRange(r.date).from;
    const idx = Math.round((thisWeekStart.getTime() - recWeekStart.getTime()) / MS_PER_WEEK);
    if (idx >= 0 && idx < TREND_WEEKS) weekly[TREND_WEEKS - 1 - idx] += 1;
  }

  return {
    stats: { totalRecords, approvedRecords, pendingRecords },
    metrics: {
      approvalRate,
      hoursThisMonth: Math.round(hoursThisMonth),
      weekly,
    },
    teams: teams.map((t) => ({ id: t.team.id, name: t.team.name, color: t.team.color })),
    recentRecords,
    avatarUrl: userData?.avatarUrl ?? null,
    skills: userData?.skills ?? [],
    skillSuggestions,
    upcomingJobs,
    needsAttention,
  };
}
