import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/session";
import { isSuperAdminEmail } from "@/lib/superAdminAllowlist";

export default async function HomePage() {
  const session = await requireAuth();
  // Signed in but not part of a company yet. A platform owner may have no
  // company of their own -> send them to the console instead of onboarding.
  if (!session.user.organizationId) {
    if (isSuperAdminEmail(session.user.email)) redirect("/super");
    redirect("/onboarding");
  }
  redirect(session.user.role === "ADMIN" ? "/admin" : "/records");
}
