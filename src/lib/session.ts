import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeEmailForDuplicateCheck } from "@/lib/email";
import { isSuperAdminEmail } from "@/lib/superAdminAllowlist";

// Cookie holding the id of an active support session. Present only during an
// active impersonation; absent for every normal request.
export const IMPERSONATE_COOKIE = "impersonate_sid";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return applyImpersonation(session);
}

// When (and ONLY when) the impersonation cookie is present, verify the caller
// is a real platform owner and, if so, re-scope this request's session to the
// target company with admin rights. No cookie → no DB hit, identical behaviour
// to before. The real user id/email are never changed, so requireSuperAdmin
// and audit attribution still resolve to the owner.
async function applyImpersonation(session: Session): Promise<Session> {
  const sid = (await cookies()).get(IMPERSONATE_COOKIE)?.value;
  if (!sid) return session;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });
  if (!isSuperAdminEmail(me?.email)) return session;

  const support = await prisma.impersonationSession.findUnique({
    where: { id: sid },
    include: { organization: { select: { id: true, name: true } } },
  });
  // Valid only if it's this owner's own session, still open, and not expired.
  if (
    !support ||
    support.endedAt ||
    support.expiresAt <= new Date() ||
    normalizeEmailForDuplicateCheck(support.actorEmail) !==
      normalizeEmailForDuplicateCheck(me!.email!)
  ) {
    return session;
  }

  const readOnly = support.mode === "READ_ONLY";

  // View-as-user: the session BECOMES that exact user, so the owner sees the app
  // with the target's real identity, role and permissions (loaded from their
  // Position by loadAccess, keyed on the now-swapped id). Never more than the
  // existing full support — a user's rights are ≤ a full admin's.
  if (support.targetUserId) {
    const target = await prisma.user.findUnique({
      where: { id: support.targetUserId },
      select: {
        id: true,
        name: true,
        role: true,
        organizationId: true,
        active: true,
        phone: true,
        storedSignature: true,
        avatarUrl: true,
        position: { select: { accessLevel: true } },
      },
    });
    // Fall back to whole-company support if the target became invalid (removed,
    // deactivated, or moved) since the session was opened.
    if (target && target.active && target.organizationId === support.organization.id) {
      const accessLevel: "ADMIN" | "WORKER" =
        target.role === "ADMIN"
          ? "ADMIN"
          : target.position?.accessLevel ?? (target.role === "WORKER" ? "WORKER" : "ADMIN");
      return {
        ...session,
        user: {
          ...session.user,
          id: target.id,
          name: target.name,
          organizationId: target.organizationId,
          role: target.role,
          accessLevel,
          phone: target.phone,
          storedSignature: target.storedSignature,
          avatarUrl: target.avatarUrl,
          impersonating: {
            orgId: support.organization.id,
            name: support.organization.name,
            readOnly: false,
            expiresAt: support.expiresAt.toISOString(),
            asUser: target.name ?? "a user",
          },
        },
      };
    }
  }

  return {
    ...session,
    user: {
      ...session.user,
      organizationId: support.organization.id,
      // Read-only support maps to supervisor-level access (view dashboards,
      // records and reports); management pages fail closed via their
      // requirePermission guards, since a supervisor lacks the manage-* caps.
      role: readOnly ? "SUPERVISOR" : "ADMIN",
      // Both support modes are office-level access (they operate in /admin).
      accessLevel: "ADMIN",
      impersonating: {
        orgId: support.organization.id,
        name: support.organization.name,
        readOnly,
        expiresAt: support.expiresAt.toISOString(),
        asUser: null,
      },
    },
  };
}

// Note: the office app gate and per-page capability checks now live in
// @/lib/authz (requireOfficeAccess / requirePermission), which read the user's
// effective access from their Position (falling back to the legacy role). The
// old role-only requireAdmin / requireReviewer guards were removed in favour of
// those, so access follows assigned positions, not just the base role.
