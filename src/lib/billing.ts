import type { Plan } from "@prisma/client";

import { PLANS } from "@/lib/plans";

// The feature-flag columns implied by a plan's module entitlements. Shared by
// the console's manual plan assignment and the Stripe webhook so both apply the
// exact same modules.
export function planFeatureFlags(plan: Plan) {
  const m = PLANS[plan].modules;
  return {
    featureInvoicing: m.invoicing,
    featureEstimates: m.estimates,
    featurePortal: m.portal,
  };
}

// A Stripe subscription status counts as "paying" (keep the paid plan) only
// while active or trialing; anything else (past_due, canceled, unpaid, …)
// drops the company back to Free.
export function statusGrantsPro(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}
