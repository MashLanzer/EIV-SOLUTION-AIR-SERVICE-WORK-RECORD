import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export default async function AdminProfilePage() {
  const session = await requireAdmin();
  const userId = session.user.id;

  const [stats, teams, recentRecords, userData] = await Promise.all([
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
      select: {
        id: true,
        jobNumber: true,
        customerName: true,
        date: true,
        status: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { skills: { select: { id: true, name: true } } },
    }),
  ]);

  const totalRecords = stats.reduce((acc, s) => acc + s._count, 0);
  const approvedRecords = stats.find((s) => s.status === "APPROVED")?._count ?? 0;
  const pendingRecords = stats.find((s) => s.status === "SUBMITTED")?._count ?? 0;

  return (
    <ProfileScreen
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      phone={session.user.phone ?? null}
      storedSignature={session.user.storedSignature ?? null}
      role="ADMIN"
      backHref="/admin"
      stats={{ totalRecords, approvedRecords, pendingRecords }}
      teams={teams.map((t) => ({ id: t.team.id, name: t.team.name, color: t.team.color }))}
      recentRecords={recentRecords.map((r) => ({
        id: r.id,
        jobNumber: r.jobNumber,
        customerName: r.customerName,
        date: r.date.toISOString().slice(0, 10),
        status: r.status,
      }))}
      skills={userData?.skills ?? []}
    />
  );
}
