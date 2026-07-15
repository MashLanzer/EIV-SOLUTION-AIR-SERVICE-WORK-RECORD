"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { connectEnabled, syncConnectAccount } from "@/lib/payments";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// Begin (or resume) Stripe Connect onboarding for the company. Creates a
// Standard connected account on first use, remembers its id, then redirects to
// Stripe's hosted onboarding. Standard accounts are owned by the company, so
// invoice payments settle directly into their own Stripe balance.
export async function startConnectOnboardingAction() {
  if (!connectEnabled) redirect("/admin/payments?error=unconfigured");
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, stripeConnectAccountId: true },
  });
  if (!org) redirect("/admin/payments");

  let url: string;
  try {
    const stripe = getStripe();
    let accountId = org.stripeConnectAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        email: session.user.email ?? undefined,
        metadata: { organizationId: org.id },
      });
      accountId = account.id;
      await prisma.organization.update({
        where: { id: org.id },
        data: { stripeConnectAccountId: accountId },
      });
    }
    const base = await baseUrl();
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/admin/payments?error=retry`,
      return_url: `${base}/admin/payments/return`,
      type: "account_onboarding",
    });
    url = link.url;
  } catch {
    redirect("/admin/payments?error=connect");
  }
  redirect(url);
}

// Manual "refresh status": pull the connected account's current state from
// Stripe and mirror charges_enabled locally, then re-render the page.
export async function refreshConnectStatusAction() {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  await syncConnectAccount(organizationId);
  revalidatePath("/admin/payments");
}
