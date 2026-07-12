"use server";

import { globalSearch, type SearchGroup } from "@/lib/globalSearch";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";

// Server action behind the command palette. Resolves the session server-side
// (never trusting the client for scope) and runs the role-scoped search.
export async function globalSearchAction(query: string): Promise<SearchGroup[]> {
  const session = await requireAuth();
  return globalSearch(
    {
      organizationId: requireOrgId(session),
      userId: session.user.id,
      isAdmin: session.user.role === "ADMIN",
    },
    query
  );
}
