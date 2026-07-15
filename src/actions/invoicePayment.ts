"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { connectEnabled } from "@/lib/payments";
import { computeTotals, formatInvoiceNumber } from "@/lib/invoices";
import { getStripe } from "@/lib/stripe";

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

// Public: a customer pays their invoice from the shared link. Creates a Stripe
// Checkout in payment mode as a DIRECT charge on the company's connected
// account (stripeAccount header), so the money settles into the company's own
// balance. Marked paid later by the webhook. No auth — reachable only with the
// invoice's unguessable publicToken.
export async function payInvoiceAction(token: string) {
  if (!connectEnabled) redirect(`/invoice/${token}?pay=unavailable`);

  const invoice = await prisma.invoice.findFirst({
    where: { publicToken: token },
    select: {
      id: true,
      number: true,
      status: true,
      taxRate: true,
      lineItems: { select: { quantity: true, unitPrice: true } },
      organization: {
        select: {
          name: true,
          stripeConnectAccountId: true,
          stripeConnectChargesEnabled: true,
        },
      },
    },
  });
  if (!invoice) redirect(`/invoice/${token}`);
  if (invoice.status === "PAID") redirect(`/invoice/${token}?pay=already`);
  // Only a sent invoice is payable (drafts/voids are not).
  if (invoice.status !== "SENT") redirect(`/invoice/${token}`);

  const account = invoice.organization.stripeConnectAccountId;
  if (!account || !invoice.organization.stripeConnectChargesEnabled) {
    redirect(`/invoice/${token}?pay=unavailable`);
  }

  const totals = computeTotals(
    invoice.lineItems.map((li) => ({ quantity: Number(li.quantity), unitPrice: Number(li.unitPrice) })),
    Number(invoice.taxRate)
  );
  const amount = Math.round(totals.total * 100);
  if (amount <= 0) redirect(`/invoice/${token}`);

  let url: string;
  try {
    const base = await baseUrl();
    const checkout = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${invoice.organization.name} — ${formatInvoiceNumber(invoice.number)}`,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        client_reference_id: invoice.id,
        metadata: { invoiceId: invoice.id },
        payment_intent_data: { metadata: { invoiceId: invoice.id } },
        success_url: `${base}/invoice/${token}?pay=success`,
        cancel_url: `${base}/invoice/${token}?pay=cancel`,
      },
      { stripeAccount: account }
    );
    url = checkout.url ?? `${base}/invoice/${token}`;
  } catch {
    redirect(`/invoice/${token}?pay=error`);
  }
  redirect(url);
}
