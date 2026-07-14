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
  return {
    ...session,
    user: {
      ...session.user,
      organizationId: support.organization.id,
      // Read-only support maps to supervisor-level access (view dashboards,
      // records and reports; management pages fail closed via requireAdmin).
      role: readOnly ? "SUPERVISOR" : "ADMIN",
      impersonating: {
        orgId: support.organization.id,
        name: support.organization.name,
        readOnly,
        expiresAt: support.expiresAt.toISOString(),
      },
    },
  };
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    redirect("/records");
  }
  return session;
}

// A reviewer is an admin or a supervisor: they can approve/return records and
// see the dashboard/reports, but supervisors are still blocked from management
// pages (those keep requireAdmin, so access fails closed).
export async function requireReviewer() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
    redirect("/records");
  }
  return session;
}
