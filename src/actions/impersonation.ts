"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { IMPERSONATE_COOKIE } from "@/lib/session";
import { SUPPORT_SESSION_MINUTES } from "@/lib/support";

type Mode = "FULL" | "READ_ONLY";

// Enter "support mode": creates a time-boxed, persisted support session and
// points the cookie at it. requireAuth re-scopes the owner's session to the
// company until the session ends or expires. Recorded in the company's audit.
export async function enterOrgAction(orgId: string, mode: Mode = "FULL") {
  const { email } = await requireSuperAdmin();
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) return;

  const expiresAt = new Date(Date.now() + SUPPORT_SESSION_MINUTES * 60 * 1000);
  const support = await prisma.impersonationSession.create({
    data: { organizationId: org.id, actorEmail: email, mode, expiresAt },
    select: { id: true },
  });

  (await cookies()).set(IMPERSONATE_COOKIE, support.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SUPPORT_SESSION_MINUTES * 60,
  });

  await logAudit({
    organizationId: org.id,
    actor: { id: "platform", name: `Platform (${email})` },
    action: "organization.impersonate.enter",
    entityType: "organization",
    entityId: org.id,
    summary: `Platform owner entered support mode (${mode === "READ_ONLY" ? "read-only" : "full"})`,
  });

  redirect("/admin");
}

// Leave support mode: ends the session and clears the cookie.
export async function exitOrgAction() {
  const jar = await cookies();
  const sid = jar.get(IMPERSONATE_COOKIE)?.value;
  const { email } = await requireSuperAdmin();
  jar.delete(IMPERSONATE_COOKIE);

  if (sid) {
    const support = await prisma.impersonationSession.findUnique({
      where: { id: sid },
      select: { id: true, organizationId: true, endedAt: true },
    });
    if (support && !support.endedAt) {
      await prisma.impersonationSession.update({
        where: { id: support.id },
        data: { endedAt: new Date() },
      });
      await logAudit({
        organizationId: support.organizationId,
        actor: { id: "platform", name: `Platform (${email})` },
        action: "organization.impersonate.exit",
        entityType: "organization",
        entityId: support.organizationId,
        summary: `Platform owner left support mode`,
      });
    }
  }

  redirect("/super");
}

// Force-end any support session from the console (e.g. one left open by
// another device). Does not touch the impersonator's cookie; their next
// request simply stops matching an open session and reverts to normal.
export async function endSupportSessionAction(sessionId: string) {
  const { email } = await requireSuperAdmin();
  const support = await prisma.impersonationSession.findUnique({
    where: { id: sessionId },
    select: { id: true, organizationId: true, endedAt: true },
  });
  if (support && !support.endedAt) {
    await prisma.impersonationSession.update({
      where: { id: support.id },
      data: { endedAt: new Date() },
    });
    await logAudit({
      organizationId: support.organizationId,
      actor: { id: "platform", name: `Platform (${email})` },
      action: "organization.impersonate.force_end",
      entityType: "organization",
      entityId: support.organizationId,
      summary: `Platform owner force-ended a support session`,
    });
  }
  revalidatePath("/super");
}
