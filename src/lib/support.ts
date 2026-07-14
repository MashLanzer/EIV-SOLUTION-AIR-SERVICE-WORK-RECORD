import { prisma } from "@/lib/prisma";

// How long a support (impersonation) session stays valid before it expires on
// its own. Kept short so an owner can't leave a company "open" indefinitely.
export const SUPPORT_SESSION_MINUTES = 60;

export type ActiveSupportSession = {
  id: string;
  organizationId: string;
  organizationName: string;
  actorEmail: string;
  readOnly: boolean;
  startedAt: Date;
  expiresAt: Date;
};

// Currently-open support sessions across all companies (for the /super list).
export async function getActiveSupportSessions(): Promise<ActiveSupportSession[]> {
  const rows = await prisma.impersonationSession.findMany({
    where: { endedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { startedAt: "desc" },
    include: { organization: { select: { name: true } } },
  });
  return rows.map((s) => ({
    id: s.id,
    organizationId: s.organizationId,
    organizationName: s.organization.name,
    actorEmail: s.actorEmail,
    readOnly: s.mode === "READ_ONLY",
    startedAt: s.startedAt,
    expiresAt: s.expiresAt,
  }));
}

// The open support session for one company, if any — drives the notice shown
// to that company's own admins.
export async function getActiveSupportSessionForOrg(
  organizationId: string
): Promise<{ expiresAt: Date; readOnly: boolean } | null> {
  const s = await prisma.impersonationSession.findFirst({
    where: { organizationId, endedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { startedAt: "desc" },
    select: { expiresAt: true, mode: true },
  });
  return s ? { expiresAt: s.expiresAt, readOnly: s.mode === "READ_ONLY" } : null;
}
