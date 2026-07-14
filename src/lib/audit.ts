import "server-only";

import { prisma } from "@/lib/prisma";

// id is null for platform-owner actions: they aren't a User in this org, so
// the actorId FK must stay null (a fake id would violate the constraint and
// silently drop the entry).
export type AuditActor = { id: string | null; name?: string | null };

// Append one entry to the org's audit trail. Fire-and-forget: a logging
// failure must never break the action that triggered it.
export async function logAudit(params: {
  organizationId: string;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  // True when performed by a platform owner (super-admin), not a company user.
  isPlatform?: boolean;
}): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        organizationId: params.organizationId,
        actorId: params.actor.id ?? null,
        actorName: params.actor.name || "—",
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        summary: params.summary,
        isPlatform: params.isPlatform ?? false,
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

// Cross-tenant audit feed for the platform console. Bypasses org scoping ON
// PURPOSE, so it must only be called from behind requireSuperAdmin. When
// platformOnly is set, returns just the super-admin's own actions.
export async function getGlobalAuditLog(
  opts: { platformOnly?: boolean; take?: number } = {}
) {
  return prisma.auditEvent.findMany({
    where: opts.platformOnly ? { isPlatform: true } : {},
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 200,
    select: {
      id: true,
      actorName: true,
      action: true,
      entityType: true,
      summary: true,
      isPlatform: true,
      createdAt: true,
      organization: { select: { id: true, name: true } },
    },
  });
}
