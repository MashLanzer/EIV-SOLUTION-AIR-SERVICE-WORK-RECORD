import "server-only";

import { prisma } from "@/lib/prisma";
import { emailLayout, sendEmail } from "@/lib/email";
import { createNotifications } from "@/lib/inappNotify";

// Email a company's active admins AND drop a matching in-app "System"
// notification in each admin's bell. Best-effort (both paths swallow their own
// failures), so it never blocks the caller. Used for billing lifecycle notices.
export async function notifyOrgAdmins(
  organizationId: string,
  msg: {
    subject: string;
    heading: string;
    lines: string[];
    cta?: { href: string; label: string };
    // Relative in-app link for the notification card (the cta href is absolute
    // for email). Defaults to the billing page since these are billing notices.
    inAppHref?: string;
  }
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { organizationId, role: "ADMIN", active: true },
    select: { id: true, email: true },
  });
  if (admins.length === 0) return;

  const to = admins.map((a) => a.email).filter((e): e is string => Boolean(e));
  if (to.length > 0) {
    await sendEmail({
      to,
      subject: msg.subject,
      html: emailLayout(msg.heading, msg.lines, msg.cta),
    });
  }

  await createNotifications({
    organizationId,
    userIds: admins.map((a) => a.id),
    category: "SYSTEM",
    type: "system",
    title: msg.heading,
    body: msg.lines[0] ?? null,
    href: msg.inAppHref ?? "/admin/billing",
  });
}
