import { prisma } from "@/lib/prisma";
import { addUtcDays, startOfUtcDay } from "@/lib/schedule";

// Everything the profile screen needs for one user, in a single round of
// queries. Shared by the worker and admin profile routes (which differ only in
// role, back link, and the record-link base) so the two pages stay in sync.
export async function getProfileData(userId: string) {
  const today = startOfUtcDay(new Date());
  const weekEnd = addUtcDays(today, 7);

  const [statusCounts, teams, recentRecords, userData, upcomingJobs, needsAttention] =
    await Promise.all([
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
        select: { skills: { select: { id: true, name: true } } },
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
    ]);

  const totalRecords = statusCounts.reduce((acc, s) => acc + s._count, 0);
  const approvedRecords = statusCounts.find((s) => s.status === "APPROVED")?._count ?? 0;
  const pendingRecords = statusCounts.find((s) => s.status === "SUBMITTED")?._count ?? 0;

  return {
    stats: { totalRecords, approvedRecords, pendingRecords },
    teams: teams.map((t) => ({ id: t.team.id, name: t.team.name, color: t.team.color })),
    recentRecords,
    skills: userData?.skills ?? [],
    upcomingJobs,
    needsAttention,
  };
}
