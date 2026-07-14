import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/superAdminAllowlist";
import { requireAuth } from "@/lib/session";

export { isSuperAdminEmail };

// Gate every /super page and action. Looks up the caller's email from the DB
// (the session doesn't carry it) and 404s for anyone not on the allowlist, so
// the platform console stays invisible to normal users.
export async function requireSuperAdmin() {
  const session = await requireAuth();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });
  if (!isSuperAdminEmail(user?.email)) notFound();
  return { session, email: user!.email };
}
