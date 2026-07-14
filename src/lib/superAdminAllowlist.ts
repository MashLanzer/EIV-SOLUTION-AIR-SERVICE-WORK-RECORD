import { normalizeEmailForDuplicateCheck } from "@/lib/email";

// Platform owners are defined ONLY by an environment allowlist — never by a
// database flag a compromised admin could flip, and with no UI to self-promote.
// SUPER_ADMIN_EMAILS is a comma-separated list; emails are compared after the
// same normalization used for duplicate detection (gmail dots/plus, case).
//
// This module deliberately imports nothing from the auth/session layer so it
// can be used inside the NextAuth callbacks without a circular import.
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
