import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { planFeatureFlags, statusGrantsPro } from "@/lib/billing";
import { appUrl } from "@/lib/email";
import { notifyOrgAdmins } from "@/lib/orgNotify";
import { STRIPE_WEBHOOK_SECRET, getStripe, stripeEnabled } from "@/lib/stripe";

const BILLING_CTA = { href: appUrl("/admin/billing"), label: "Manage billing" };

// Find the org owning a Stripe customer, for lifecycle email notices.
async function orgIdForCustomer(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  if (!customer) return null;
  const customerId = typeof customer === "string" ? customer : customer.id;
  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return org?.id ?? null;
}

export const runtime = "nodejs";
// Never cache; every call is a signed event we must process live.
export const dynamic = "force-dynamic";

// Reconcile a company's plan from the current state of its Stripe subscription:
// Pro while active/trialing, Free otherwise. Applies the matching module flags.
async function syncFromSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const metaOrgId = (sub.metadata?.organizationId as string | undefined) ?? undefined;

  const org = await prisma.organization.findFirst({
    where: metaOrgId
      ? { OR: [{ stripeCustomerId: customerId }, { id: metaOrgId }] }
      : { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (!org) return;

  const pro = statusGrantsPro(sub.status);
  const plan = pro ? "PRO" : "FREE";
  // In recent Stripe API versions the period boundary lives on the item.
  const periodEndUnix = sub.items?.data?.[0]?.current_period_end ?? null;
  const periodEnd = periodEndUnix ? new Date(periodEndUnix * 1000) : null;

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      plan,
      ...planFeatureFlags(plan),
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      currentPeriodEnd: periodEnd,
    },
  });
}

export async function POST(req: Request) {
  if (!stripeEnabled || !STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("Stripe not configured", { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.subscription) {
          const subId = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
          const sub = await getStripe().subscriptions.retrieve(subId);
          await syncFromSubscription(sub);
          const orgId = await orgIdForCustomer(sub.customer);
          if (orgId) {
            await notifyOrgAdmins(orgId, {
              subject: "You're on Pro 🎉",
              heading: "Welcome to Pro",
              lines: [
                "Your subscription is active — invoicing, estimates, the customer portal and unlimited users are unlocked.",
              ],
              cta: BILLING_CTA,
            });
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const orgId = await orgIdForCustomer(inv.customer);
        if (orgId) {
          await notifyOrgAdmins(orgId, {
            subject: "Payment failed — action needed",
            heading: "We couldn't process your payment",
            lines: [
              "Your last Pro payment didn't go through. Update your card to avoid losing Pro features.",
            ],
            cta: BILLING_CTA,
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await syncFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await syncFromSubscription(sub);
        const orgId = await orgIdForCustomer(sub.customer);
        if (orgId) {
          await notifyOrgAdmins(orgId, {
            subject: "Your subscription ended",
            heading: "Moved to the Free plan",
            lines: [
              "Your Pro subscription has ended and your company is now on Free. You can re-subscribe anytime.",
            ],
            cta: BILLING_CTA,
          });
        }
        break;
      }
      default:
        break;
    }
  } catch {
    // Log-and-200 would hide real failures; return 500 so Stripe retries.
    return new NextResponse("Handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
