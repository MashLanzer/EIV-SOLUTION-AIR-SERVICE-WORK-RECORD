import "server-only";

import { prisma } from "@/lib/prisma";

export type AuditActor = { id: string; name?: string | null };

// Append one entry to the org's audit trail. Fire-and-forget: a logging
// failure must never break the action that triggered it.
export async function logAudit(params: {
  organizationId: string;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
}): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        organizationId: params.organizationId,
        actorId: params.actor.id,
        actorName: params.actor.name || "—",
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        summary: params.summary,
      },
    });
  } catch {
    // Swallow: audit is best-effort.
  }
}

export async function getAuditLog(organizationId: string, take = 150) {
  return prisma.auditEvent.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      actorName: true,
      action: true,
      entityType: true,
      summary: true,
      createdAt: true,
    },
  });
}
