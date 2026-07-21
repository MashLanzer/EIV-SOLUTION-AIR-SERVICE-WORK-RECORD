"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { createNotifications } from "@/lib/inappNotify";

export type MessageActionState = { ok?: boolean; error?: string; sentTo?: number };

const schema = z.object({
  title: z.string().trim().min(1, "Add a subject.").max(120),
  body: z.string().trim().min(1, "Write a message.").max(2000),
  audience: z.enum(["admins", "all"]),
});

// Send a targeted in-app message from the platform to a company. Lands in each
// recipient's notification bell (SYSTEM tab) — in-app only, no email/push. The
// company sees it as a message "from AeroTrack"; the platform audit records who
// sent it and to how many.
export async function sendOrgMessageAction(
  orgId: string,
  _prev: MessageActionState,
  formData: FormData
): Promise<MessageActionState> {
  const { email } = await requireSuperAdmin();

  const parsed = schema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    audience: formData.get("audience"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid message." };
  }
  const { title, body, audience } = parsed.data;

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) return { error: "Company not found." };

  // "admins" = anyone with office access: base ADMIN role, or a Position that
  // grants ADMIN access. "all" = every active member.
  const recipients = await prisma.user.findMany({
    where: {
      organizationId: org.id,
      active: true,
      ...(audience === "admins"
        ? { OR: [{ role: "ADMIN" }, { position: { accessLevel: "ADMIN" } }] }
        : {}),
    },
    select: { id: true },
  });

  if (recipients.length === 0) {
    return { error: "No matching recipients in this company." };
  }

  await createNotifications({
    organizationId: org.id,
    userIds: recipients.map((r) => r.id),
    category: "SYSTEM",
    type: "platform_message",
    title,
    body,
    actorName: "AeroTrack",
  });

  await logAudit({
    organizationId: org.id,
    actor: { id: null, name: `Platform (${email})` },
    action: "platform.message.send",
    entityType: "organization",
    entityId: org.id,
    summary: `Platform sent a message to ${org.name} (${recipients.length} ${
      audience === "admins" ? "admins" : "members"
    })`,
    isPlatform: true,
  });

  return { ok: true, sentTo: recipients.length };
}
