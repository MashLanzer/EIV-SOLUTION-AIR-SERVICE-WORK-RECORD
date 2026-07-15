import "server-only";

import { prisma } from "@/lib/prisma";
import { emailLayout, sendEmail } from "@/lib/email";

// Email a company's active admins. Best-effort (sendEmail no-ops without a
// provider), so it never blocks the caller. Used for billing lifecycle notices.
export async function notifyOrgAdmins(
  organizationId: string,
  msg: { subject: string; heading: string; lines: string[]; cta?: { href: string; label: string } }
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { organizationId, role: "ADMIN", active: true },
    select: { email: true },
  });
  const to = admins.map((a) => a.email).filter(Boolean);
  if (to.length === 0) return;
  await sendEmail({ to, subject: msg.subject, html: emailLayout(msg.heading, msg.lines, msg.cta) });
}
