import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/session";

export default async function HomePage() {
  const session = await requireAuth();
  redirect(session.user.role === "ADMIN" ? "/admin" : "/records");
}
