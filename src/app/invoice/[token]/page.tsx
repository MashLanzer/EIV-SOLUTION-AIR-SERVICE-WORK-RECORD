import { notFound } from "next/navigation";

import { payInvoiceAction } from "@/actions/invoicePayment";
import { Alert } from "@/components/ui/alert";
import { prisma } from "@/lib/prisma";
import { connectEnabled } from "@/lib/payments";
import { computeTotals, formatInvoiceNumber } from "@/lib/invoices";
import { getLocale, getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// A public, read-only invoice for the customer, reachable only via the
// invoice's unguessable publicToken. No auth by design — the admin shares
// the link. Light-only, like the receipt page.
export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ pay?: string }>;
}) {
  const { token } = await params;
  const { pay } = await searchParams;
  const invoice = await prisma.invoice.findFirst({
    where: { publicToken: token },
    include: {
      lineItems: { orderBy: { position: "asc" } },
      organization: {
        select: {
          name: true,
          logoUrl: true,
          companyPhone: true,
          companyAddress: true,
          currencySymbol: true,
          stripeConnectChargesEnabled: true,
        },
      },
    },
  });
  if (!invoice) notFound();

  // Online payment is offered only when Stripe is configured, the company can
  // accept charges, and the invoice is sent-but-unpaid.
  const canPay =
    connectEnabled &&
    invoice.organization.stripeConnectChargesEnabled &&
    invoice.status === "SENT";

  const t = (await getT()).invoices;
  const locale = await getLocale();
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const org = invoice.organization;
  const cur = org?.currencySymbol || "$";
  const money = (n: number) => `${cur}${n.toFixed(2)}`;
  const statusLabel: Record<typeof invoice.status, string> = {
    DRAFT: t.statusDraft,
    SENT: t.statusSent,
    PAID: t.statusPaid,
    VOID: t.statusVoid,
  };
  const totals = computeTotals(
    invoice.lineItems.map((li) => ({
      quantity: Number(li.quantity),
      unitPrice: Number(li.unitPrice),
    })),
    Number(invoice.taxRate)
  );

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {/* Company header */}
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-6">
          <div className="flex min-w-0 items-center gap-4">
            {org?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-contain" />
            ) : null}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-neutral-900">{org?.name}</h1>
              <p className="truncate text-sm text-neutral-500">
                {[org?.companyPhone, org?.companyAddress].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold tabular-nums text-neutral-900">
              {formatInvoiceNumber(invoice.number)}
            </p>
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              {statusLabel[invoice.status]}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{t.billTo}</p>
              <p className="mt-1 font-medium text-neutral-900">{invoice.customerName}</p>
              {invoice.customerAddress && (
                <p className="text-sm text-neutral-500">{invoice.customerAddress}</p>
              )}
            </div>
            <div className="text-right text-sm text-neutral-500 tabular-nums">
              <p>
                {t.issued}: {dateFmt.format(invoice.issueDate)}
              </p>
              {invoice.dueDate && (
                <p>
                  {t.due}: {dateFmt.format(invoice.dueDate)}
                </p>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase text-neutral-400">
                  <th className="px-3 py-2 font-semibold">{t.descriptionPlaceholder}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t.qty}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t.unitPrice}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t.amount}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((li) => (
                  <tr key={li.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-3 py-2 text-neutral-900">{li.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-neutral-600">
                      {Number(li.quantity)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-neutral-600">
                      {money(Number(li.unitPrice))}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-neutral-900">
                      {money(Number(li.quantity) * Number(li.unitPrice))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="ml-auto flex w-full max-w-xs flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">{t.subtotal}</span>
              <span className="tabular-nums text-neutral-900">{money(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">
                {t.tax} ({Number(invoice.taxRate)}%)
              </span>
              <span className="tabular-nums text-neutral-900">{money(totals.tax)}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold text-neutral-900">
              <span>{t.total}</span>
              <span className="tabular-nums">{money(totals.total)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div>
              <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {t.notes}
              </h2>
              <p className="whitespace-pre-wrap text-sm text-neutral-700">{invoice.notes}</p>
            </div>
          )}

          {/* Payment outcome banners (customer returns here from Stripe). */}
          {pay === "success" && <Alert variant="success">{t.paySuccess}</Alert>}
          {pay === "cancel" && (
            <div className="rounded-lg bg-neutral-50 px-3 py-2 text-center text-sm text-neutral-600">
              {t.payCanceled}
            </div>
          )}
          {pay === "already" && (
            <div className="rounded-lg bg-neutral-50 px-3 py-2 text-center text-sm text-neutral-600">
              {t.payAlready}
            </div>
          )}
          {pay === "error" && <Alert variant="warning">{t.payError}</Alert>}
          {pay === "unavailable" && <Alert variant="warning">{t.payUnavailable}</Alert>}

          <div className="flex flex-col items-center gap-3 border-t border-neutral-100 pt-4">
            {canPay && (
              <form action={payInvoiceAction.bind(null, token)} className="w-full">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  {t.payNow} · {money(totals.total)}
                </button>
              </form>
            )}
            <a
              href={`/invoice/${token}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {t.downloadPdf}
            </a>
            <p className="text-center text-xs text-neutral-400">{t.publicFooter}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
