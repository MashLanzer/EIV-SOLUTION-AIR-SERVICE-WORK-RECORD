import { NextResponse } from "next/server";

import { syncConnectAccount } from "@/lib/payments";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

// Landing endpoint after the company returns from Stripe Connect onboarding.
// Syncs the account's charges_enabled state before showing the payments page,
// so the status is accurate immediately (no waiting on a webhook).
export async function GET(req: Request) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  await syncConnectAccount(organizationId);
  return NextResponse.redirect(new URL("/admin/payments?connected=1", req.url));
}
