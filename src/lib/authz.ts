import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { effectiveAccess } from "@/lib/positions";
import type { AccessLevel, LegacyRole, PermissionKey } from "@/lib/permissions";

// The single source of truth for "what can this user do". Uses the session's
// role (which already accounts for impersonation) as the base, and layers the
// user's assigned Position on top — read fresh from the DB so permission edits
// take effect immediately.
//
// During impersonation the session id is the platform owner (who has no
// Position in the target org), so we skip the position lookup and use the
// impersonation role directly.
export async function loadAccess(
  session: Session
): Promise<{ accessLevel: AccessLevel; permissions: string[] }> {
  const role = session.user.role as LegacyRole;

  if (session.user.impersonating) {
    return effectiveAccess({ role, position: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { position: { select: { accessLevel: true, permissions: true } } },
  });
  return effectiveAccess({ role, position: user?.position ?? null });
}

// Boolean check for a specific capability, for conditionally showing UI or
// gating an action without redirecting.
export async function sessionCan(session: Session, key: PermissionKey): Promise<boolean> {
  const { permissions } = await loadAccess(session);
  return permissions.includes(key);
}

// Guard a page/action on a capability: requires a signed-in user who has the
// permission, else sends them back to their app home. Returns the session so
// callers can keep using it, mirroring requireAdmin/requireReviewer.
export async function requirePermission(key: PermissionKey): Promise<Session> {
  const session = await requireAuth();
  const { permissions } = await loadAccess(session);
  if (!permissions.includes(key)) {
    redirect("/records");
  }
  return session;
}
