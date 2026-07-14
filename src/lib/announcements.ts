import { prisma } from "@/lib/prisma";

// The single active platform announcement (most recent), or null. Shown to
// every company's admins via the admin layout banner.
export async function getActiveAnnouncement(): Promise<{ id: string; message: string } | null> {
  const a = await prisma.announcement.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, message: true },
  });
  return a ?? null;
}
