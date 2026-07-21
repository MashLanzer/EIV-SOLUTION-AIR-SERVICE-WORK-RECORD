// A single, consolidated "health" read for a company on the platform console —
// a defensible 0–100 score plus a tier, computed from concrete signals the
// console already has. Pure and deterministic so it's easy to test and reuse.

export type HealthTier = "healthy" | "fair" | "at_risk" | "suspended";

export type HealthInput = {
  active: boolean;
  records: number;
  users: number;
  invoices: number;
  lastActivityAt: Date | null;
  // Injectable "now" so scoring is deterministic in tests.
  now?: Date;
};

export type Health = { score: number; tier: HealthTier; label: string };

const TIER_LABEL: Record<HealthTier, string> = {
  healthy: "Healthy",
  fair: "Fair",
  at_risk: "At risk",
  suspended: "Suspended",
};

const DAY = 86400000;

export function computeHealth(input: HealthInput): Health {
  // Suspended overrides everything — the account is off, score is zero.
  if (!input.active) {
    return { score: 0, tier: "suspended", label: TIER_LABEL.suspended };
  }

  const now = (input.now ?? new Date()).getTime();
  let score = 0;

  // Activation: has the company ever logged work?
  if (input.records > 0) score += 30;

  // Recency: how recently was the last work record created?
  if (input.lastActivityAt) {
    const days = (now - input.lastActivityAt.getTime()) / DAY;
    if (days <= 7) score += 40;
    else if (days <= 30) score += 25;
    else if (days <= 90) score += 10;
  }

  // Team size: a lone user is more fragile than a staffed company.
  if (input.users >= 3) score += 15;
  else if (input.users >= 1) score += 8;

  // Billing engagement: any invoicing at all is a good sign of real use.
  if (input.invoices > 0) score += 15;

  score = Math.min(100, score);

  const tier: HealthTier = score >= 70 ? "healthy" : score >= 40 ? "fair" : "at_risk";
  return { score, tier, label: TIER_LABEL[tier] };
}
