"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { IMPERSONATE_COOKIE } from "@/lib/session";

// Enter "support mode" for a company: sets the impersonation cookie so the
// owner's session is re-scoped to that org (see requireAuth). Every entry is
// recorded in the target company's audit log.
export async function enterOrgAction(orgId: string) {
  const { email } = await requireSuperAdmin();
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) return;

  (await cookies()).set(IMPERSONATE_COOKIE, org.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours; also cleared on Exit
  });

  await logAudit({
    organizationId: org.id,
    actor: { id: "platform", name: `Platform (${email})` },
    action: "organization.impersonate.enter",
    entityType: "organization",
    entityId: org.id,
    summary: `Platform owner entered support mode`,
  });

  redirect("/admin");
}

// Leave support mode: clears the cookie and returns to the platform console.
export async function exitOrgAction() {
  const jar = await cookies();
  const orgId = jar.get(IMPERSONATE_COOKIE)?.value;
  const { email } = await requireSuperAdmin();
  jar.delete(IMPERSONATE_COOKIE);

  if (orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true },
    });
    if (org) {
      await logAudit({
        organizationId: org.id,
        actor: { id: "platform", name: `Platform (${email})` },
        action: "organization.impersonate.exit",
        entityType: "organization",
        entityId: org.id,
        summary: `Platform owner left support mode`,
      });
    }
  }

  redirect("/super");
}
