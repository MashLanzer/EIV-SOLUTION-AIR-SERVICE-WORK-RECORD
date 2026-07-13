import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    redirect("/records");
  }
  return session;
}

// A reviewer is an admin or a supervisor: they can approve/return records and
// see the dashboard/reports, but supervisors are still blocked from management
// pages (those keep requireAdmin, so access fails closed).
export async function requireReviewer() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
    redirect("/records");
  }
  return session;
}
