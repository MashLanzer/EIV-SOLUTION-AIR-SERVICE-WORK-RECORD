import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/session";
import { loadAccess } from "@/lib/authz";
import { isSuperAdminEmail } from "@/lib/superAdminAllowlist";

export default async function HomePage() {
  const session = await requireAuth();
  // Signed in but not part of a company yet. A platform owner may have no
  // company of their own -> send them to the console instead of onboarding.
  if (!session.user.organizationId) {
    if (isSuperAdminEmail(session.user.email)) redirect("/super");
    redirect("/onboarding");
  }
  // Route by effective access level, not just the legacy role: a user placed on
  // an office Position (e.g. Accountant) lands in the admin app even though their
  // base role is WORKER, and vice-versa.
  const { accessLevel } = await loadAccess(session);
  redirect(accessLevel === "ADMIN" ? "/admin" : "/records");
}
