import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { normalizeEmailForDuplicateCheck } from "@/lib/email";
import { requireAuth } from "@/lib/session";

// Platform owners are defined ONLY by an environment allowlist — never by a
// database flag a compromised admin could flip, and with no UI to self-promote.
// SUPER_ADMIN_EMAILS is a comma-separated list; emails are compared after the
// same normalization used for duplicate detection (gmail dots/plus, case).
function allowlist(): Set<string> {
  const raw = process.env.SUPER_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .map((e) => normalizeEmailForDuplicateCheck(e))
  );
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = allowlist();
  if (list.size === 0) return false;
  return list.has(normalizeEmailForDuplicateCheck(email));
}

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
