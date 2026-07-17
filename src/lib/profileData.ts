import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
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
    currency,
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
        select: {
          name: true,
          phone: true,
          storedSignature: true,
          avatarUrl: true,
          createdAt: true,
          skills: { select: { id: true, name: true } },
        },
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
      getCurrencySymbol(organizationId),
    ]);

  // Approved pay this month, attributed by name the same way the admin pay
  // report does: sum lead pay where this person is the lead installer plus
  // helper pay where they're the helper. Org-scoped (names aren't unique across
  // companies). Only counts APPROVED records, matching the pay report.
  const name = userData?.name ?? "";
  const payRecords = name
    ? await prisma.workRecord.findMany({
        where: {
          organizationId,
          status: "APPROVED",
          date: { gte: monthStart },
          OR: [
            { leadInstallerName: { equals: name, mode: "insensitive" } },
            { helperName: { equals: name, mode: "insensitive" } },
          ],
        },
        select: {
          leadInstallerName: true,
          helperName: true,
          leadInstallerPay: true,
          helperPay: true,
        },
      })
    : [];
  const lowerName = name.toLowerCase();
  let payThisMonth = 0;
  for (const r of payRecords) {
    if (r.leadInstallerName.toLowerCase() === lowerName) payThisMonth += Number(r.leadInstallerPay);
    if (r.helperName && r.helperName.toLowerCase() === lowerName) {
      payThisMonth += Number(r.helperPay ?? 0);
    }
  }
  payThisMonth = Math.round(payThisMonth * 100) / 100;

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

  // --- Month-over-month comparison + 12-week activity heatmap ---
  const HEATMAP_DAYS = 84; // 12 weeks
  const heatmapStart = addUtcDays(today, -(HEATMAP_DAYS - 1));
  const prevMonthStart = utcDay(today.getUTCFullYear(), today.getUTCMonth() - 1, 1);
  const analyticsStart = heatmapStart < prevMonthStart ? heatmapStart : prevMonthStart;

  const [analyticsRecords, timeOffRows] = await Promise.all([
    prisma.workRecord.findMany({
      where: { submittedById: userId, date: { gte: analyticsStart } },
      select: { date: true, status: true, arrivalTime: true, departureTime: true },
    }),
    // Upcoming time off (read-only here; the office schedules it). Anything that
    // hasn't ended yet, soonest first.
    prisma.timeOff.findMany({
      where: { userId, endDate: { gte: today } },
      orderBy: { startDate: "asc" },
      take: 6,
      select: { id: true, startDate: true, endDate: true, reason: true },
    }),
  ]);

  // Daily submission counts for the heatmap, as a fixed 84-day window
  // (oldest → today) so the grid renders even on quiet days.
  const dayCounts = new Map<string, number>();
  for (const r of analyticsRecords) {
    if (r.date >= heatmapStart) {
      const key = r.date.toISOString().slice(0, 10);
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
  }
  const activityDays: { date: string; count: number }[] = [];
  for (let i = 0; i < HEATMAP_DAYS; i++) {
    const key = addUtcDays(heatmapStart, i).toISOString().slice(0, 10);
    activityDays.push({ date: key, count: dayCounts.get(key) ?? 0 });
  }

  // "This month so far" vs "all of last month" across records, hours, approval.
  function monthAgg(from: Date, to: Date) {
    let count = 0;
    let approved = 0;
    let hours = 0;
    for (const r of analyticsRecords) {
      if (r.date >= from && r.date < to) {
        count += 1;
        if (r.status === "APPROVED") approved += 1;
        hours += spanHours(r.arrivalTime, r.departureTime);
      }
    }
    return {
      count,
      hours: Math.round(hours),
      approvalRate: count > 0 ? Math.round((approved / count) * 100) : 0,
    };
  }
  const curMonth = monthAgg(monthStart, addUtcDays(today, 1));
  const prevMonth = monthAgg(prevMonthStart, monthStart);
  const monthCompare = {
    records: { current: curMonth.count, previous: prevMonth.count },
    hours: { current: curMonth.hours, previous: prevMonth.hours },
    approvalRate: { current: curMonth.approvalRate, previous: prevMonth.approvalRate },
  };
  const timeOff = timeOffRows.map((t) => ({
    id: t.id,
    startDate: t.startDate.toISOString().slice(0, 10),
    endDate: t.endDate.toISOString().slice(0, 10),
    reason: t.reason,
  }));

  return {
    stats: { totalRecords, approvedRecords, pendingRecords },
    metrics: {
      approvalRate,
      hoursThisMonth: Math.round(hoursThisMonth),
      weekly,
    },
    monthCompare,
    activityDays,
    timeOff,
    payThisMonth,
    currency,
    teams: teams.map((t) => ({ id: t.team.id, name: t.team.name, color: t.team.color })),
    recentRecords,
    name: userData?.name ?? "",
    phone: userData?.phone ?? null,
    storedSignature: userData?.storedSignature ?? null,
    memberSince: userData?.createdAt ?? null,
    avatarUrl: userData?.avatarUrl ?? null,
    skills: userData?.skills ?? [],
    skillSuggestions,
    upcomingJobs,
    needsAttention,
  };
}
