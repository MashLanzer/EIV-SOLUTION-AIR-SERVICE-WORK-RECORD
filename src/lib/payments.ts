import "server-only";

import { prisma } from "@/lib/prisma";
import { getStripe, stripeSecretConfigured } from "@/lib/stripe";

// Online invoice payments run on Stripe Connect: each company connects its own
// Standard account and customers pay invoices directly into it. The platform
// only needs its secret key; a company is "ready to collect" once it has a
// connected account whose charges are enabled.
export const connectEnabled = stripeSecretConfigured;

export type PaymentStatus = {
  // Platform-level: is Stripe configured at all?
  configured: boolean;
  // Does this org have a connected account yet?
  connected: boolean;
  // Can that account actually accept charges (onboarding finished)?
  chargesEnabled: boolean;
  accountId: string | null;
};

export async function getPaymentStatus(organizationId: string): Promise<PaymentStatus> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { stripeConnectAccountId: true, stripeConnectChargesEnabled: true },
  });
  return {
    configured: connectEnabled,
    connected: Boolean(org?.stripeConnectAccountId),
    chargesEnabled: Boolean(org?.stripeConnectChargesEnabled),
    accountId: org?.stripeConnectAccountId ?? null,
  };
}

// Pull the live account state from Stripe and mirror charges_enabled locally.
// Called after the company returns from onboarding so the UI reflects reality
// without waiting for a webhook. No-ops (returns current row) if unconfigured.
export async function syncConnectAccount(organizationId: string): Promise<PaymentStatus> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { stripeConnectAccountId: true, stripeConnectChargesEnabled: true },
  });
  if (!connectEnabled || !org?.stripeConnectAccountId) {
    return {
      configured: connectEnabled,
      connected: Boolean(org?.stripeConnectAccountId),
      chargesEnabled: Boolean(org?.stripeConnectChargesEnabled),
      accountId: org?.stripeConnectAccountId ?? null,
    };
  }
  let chargesEnabled = org.stripeConnectChargesEnabled;
  try {
    const account = await getStripe().accounts.retrieve(org.stripeConnectAccountId);
    chargesEnabled = Boolean(account.charges_enabled);
    if (chargesEnabled !== org.stripeConnectChargesEnabled) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { stripeConnectChargesEnabled: chargesEnabled },
      });
    }
  } catch {
    // Account fetch failed (e.g. deleted on Stripe's side) — keep the stored
    // value; the admin can retry.
  }
  return {
    configured: connectEnabled,
    connected: true,
    chargesEnabled,
    accountId: org.stripeConnectAccountId,
  };
}
