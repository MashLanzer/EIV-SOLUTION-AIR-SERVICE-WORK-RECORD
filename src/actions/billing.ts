"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { STRIPE_PRICE_PRO, getStripe, stripeEnabled } from "@/lib/stripe";

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// Start a Stripe Checkout for the Pro subscription. Creates (and remembers) a
// Stripe customer for the company on first use, then redirects to Stripe's
// hosted payment page. No-op if Stripe isn't configured.
export async function createCheckoutSessionAction() {
  if (!stripeEnabled) redirect("/admin/billing?error=unconfigured");
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, stripeCustomerId: true },
  });
  if (!org) redirect("/admin/billing");

  const stripe = getStripe();

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      email: session.user.email ?? undefined,
      metadata: { organizationId: org.id },
    });
    customerId = customer.id;
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const base = await baseUrl();
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: STRIPE_PRICE_PRO, quantity: 1 }],
    client_reference_id: org.id,
    subscription_data: { metadata: { organizationId: org.id } },
    success_url: `${base}/admin/billing?upgraded=1`,
    cancel_url: `${base}/admin/billing`,
    allow_promotion_codes: true,
  });

  if (checkout.url) redirect(checkout.url);
  redirect("/admin/billing");
}

// Open the Stripe Billing Portal so the company can change card, view invoices
// or cancel. Requires an existing Stripe customer.
export async function createBillingPortalSessionAction() {
  if (!stripeEnabled) redirect("/admin/billing?error=unconfigured");
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { stripeCustomerId: true },
  });
  if (!org?.stripeCustomerId) redirect("/admin/billing");

  const stripe = getStripe();
  const base = await baseUrl();
  const portal = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${base}/admin/billing`,
  });
  redirect(portal.url);
}
