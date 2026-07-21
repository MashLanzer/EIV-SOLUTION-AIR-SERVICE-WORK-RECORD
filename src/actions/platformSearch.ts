"use server";

import { requireSuperAdmin } from "@/lib/superAdmin";
import { platformSearch, type PlatformSearchResult } from "@/lib/platform";

// Cross-tenant search for the owner console. Gated by requireSuperAdmin, so a
// normal user can never reach it even though it bypasses org scoping.
export async function platformSearchAction(query: string): Promise<PlatformSearchResult> {
  await requireSuperAdmin();
  return platformSearch(query);
}
