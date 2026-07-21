import "server-only";

import { prisma } from "@/lib/prisma";
import { normalizeEmailForDuplicateCheck } from "@/lib/email";
import { isSuperAdminEmail } from "@/lib/superAdminAllowlist";

// Whether an email has platform-console access: either a "root owner" from the
// SUPER_ADMIN_EMAILS env allowlist, or an admin granted from the /super console
// (stored in PlatformAdmin). Kept separate from the sync, env-only
// isSuperAdminEmail — that one stays the trust root that decides who may manage
// the admin list, and is safe to call in the hot NextAuth callback path.
export async function isPlatformAdmin(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  if (isSuperAdminEmail(email)) return true;
  const normalized = normalizeEmailForDuplicateCheck(email);
  const found = await prisma.platformAdmin.findUnique({
    where: { email: normalized },
    select: { id: true },
  });
  return found !== null;
}

export async function listPlatformAdmins() {
  return prisma.platformAdmin.findMany({ orderBy: { createdAt: "desc" } });
}
