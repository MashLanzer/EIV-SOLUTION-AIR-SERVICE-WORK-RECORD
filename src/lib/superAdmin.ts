import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { isSuperAdminEmail } from "@/lib/superAdminAllowlist";
import { isPlatformAdmin } from "@/lib/platformAdmins";
import { requireAuth } from "@/lib/session";

export { isSuperAdminEmail };

// Gate every /super page and action, and 404 for anyone not on the allowlist
// so the platform console stays invisible to normal users.
//
// Gate on the email carried in the session — it's set for every signed-in user,
// including a platform owner who has NOT joined any company (whose DB user row,
// and therefore session.user.id, may be empty). Keying off the id used to 404
// those owners outright. Fall back to a lookup by id only if the session
// somehow lacks an email.
export async function requireSuperAdmin() {
  const session = await requireAuth();
  let email = session.user.email ?? null;
  if (!email && session.user.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });
    email = user?.email ?? null;
  }
  // Console access = env owner OR a DB-granted admin. `isOwner` (env allowlist
  // only) stays the trust root: it gates who may manage the admin list.
  if (!(await isPlatformAdmin(email))) notFound();
  return { session, email: email!, isOwner: isSuperAdminEmail(email) };
}
