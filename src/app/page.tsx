import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/session";

export default async function HomePage() {
  const session = await requireAuth();
  // Signed in but not part of a company yet -> create or join one.
  if (!session.user.organizationId) redirect("/onboarding");
  redirect(session.user.role === "ADMIN" ? "/admin" : "/records");
}
