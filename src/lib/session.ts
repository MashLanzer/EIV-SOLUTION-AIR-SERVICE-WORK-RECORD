import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/superAdminAllowlist";

// Cookie a platform owner sets to view a company in "support mode". Present
// only during an active impersonation; absent for every normal request.
export const IMPERSONATE_COOKIE = "impersonate_org";

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
  const orgId = (await cookies()).get(IMPERSONATE_COOKIE)?.value;
  if (!orgId) return session;

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });
  if (!isSuperAdminEmail(me?.email)) return session;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) return session;

  return {
    ...session,
    user: {
      ...session.user,
      organizationId: org.id,
      role: "ADMIN",
      impersonating: { orgId: org.id, name: org.name },
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
