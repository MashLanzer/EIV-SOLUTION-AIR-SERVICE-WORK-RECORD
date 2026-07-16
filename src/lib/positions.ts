import { prisma } from "@/lib/prisma";
import {
  DEFAULT_POSITIONS,
  accessLevelForLegacyRole,
  permissionsForLegacyRole,
  type AccessLevel,
  type LegacyRole,
  type PermissionKey,
} from "@/lib/permissions";

// Ensure a company has its three built-in positions (Administrator / Supervisor
// / Worker), mirroring the legacy roles. Idempotent: creates only the missing
// ones and never overwrites edits an admin made to an existing system position.
// Returns nothing; callers that need the positions should read them after.
export async function ensureDefaultPositions(organizationId: string): Promise<void> {
  const existing = await prisma.position.findMany({
    where: { organizationId, systemKey: { not: null } },
    select: { systemKey: true },
  });
  const have = new Set(existing.map((p) => p.systemKey));
  const missing = DEFAULT_POSITIONS.filter((d) => !have.has(d.slug));
  if (missing.length === 0) return;

  await prisma.position.createMany({
    data: missing.map((d) => ({
      organizationId,
      // English name as the stored default; admins can rename it. The UI can
      // still localize the label of system positions by their systemKey.
      name: d.en,
      accessLevel: d.accessLevel,
      permissions: [...d.permissions],
      isSystem: true,
      systemKey: d.slug,
    })),
    skipDuplicates: true,
  });
}

// The company's positions as a plain id/name list for assignment dropdowns
// (create/edit worker). Ensures the built-in positions exist first, so the
// picker is never empty on a company that hasn't opened the Roles page yet.
export async function getAssignablePositions(
  organizationId: string
): Promise<{ id: string; name: string }[]> {
  await ensureDefaultPositions(organizationId);
  return prisma.position.findMany({
    where: { organizationId },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

// The effective permissions + access level for a user, from their assigned
// position if any, otherwise falling back to the legacy role defaults. This is
// the single place enforcement will read from as we migrate role checks over.
export function effectiveAccess(user: {
  role: LegacyRole;
  position?: { accessLevel: AccessLevel; permissions: string[] } | null;
}): { accessLevel: AccessLevel; permissions: string[] } {
  if (user.position) {
    return {
      accessLevel: user.position.accessLevel,
      permissions: user.position.permissions,
    };
  }
  return {
    accessLevel: accessLevelForLegacyRole(user.role),
    permissions: permissionsForLegacyRole(user.role) as PermissionKey[],
  };
}
