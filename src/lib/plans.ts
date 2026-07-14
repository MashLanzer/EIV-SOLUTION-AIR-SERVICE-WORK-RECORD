import type { Plan } from "@prisma/client";

export type PlanDef = {
  name: string;
  priceMonthly: number;
  // null = unlimited.
  maxUsers: number | null;
  modules: { invoicing: boolean; estimates: boolean; portal: boolean };
  blurb: string;
};

// The plan catalog. Prices are display-only for now (Fase A); Stripe price IDs
// wire in during Fase B. A company with a null plan is legacy/grandfathered:
// no limits, all modules governed only by their feature flags.
export const PLANS: Record<Plan, PlanDef> = {
  FREE: {
    name: "Free",
    priceMonthly: 0,
    maxUsers: 5,
    modules: { invoicing: false, estimates: false, portal: false },
    blurb: "Records, projects and scheduling for a small crew.",
  },
  PRO: {
    name: "Pro",
    priceMonthly: 29,
    maxUsers: null,
    modules: { invoicing: true, estimates: true, portal: true },
    blurb: "Everything: invoicing, estimates and the customer portal.",
  },
};

export const PLAN_KEYS: Plan[] = ["FREE", "PRO"];

export function planLabel(plan: Plan | null): string {
  return plan ? PLANS[plan].name : "Legacy";
}

// The user cap for a company: null plan (legacy) is unlimited.
export function planMaxUsers(plan: Plan | null): number | null {
  return plan ? PLANS[plan].maxUsers : null;
}
