import { notFound } from "next/navigation";

import { EstimateRespondForm } from "@/components/estimates/EstimateRespondForm";
import { prisma } from "@/lib/prisma";
import { computeTotals } from "@/lib/invoices";
import { formatEstimateNumber } from "@/lib/estimates";
import { getLocale, getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PublicEstimatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const estimate = await prisma.estimate.findFirst({
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
        },
      },
    },
  });
  if (!estimate) notFound();

  const t = (await getT()).estimates;
  const locale = await getLocale();
  const dateFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const org = estimate.organization;
  const cur = org?.currencySymbol || "$";
  const money = (n: number) => `${cur}${n.toFixed(2)}`;
  const statusLabel: Record<typeof estimate.status, string> = {
    DRAFT: t.statusDraft,
    SENT: t.statusSent,
    ACCEPTED: t.statusAccepted,
    DECLINED: t.statusDeclined,
  };
  const totals = computeTotals(
    estimate.lineItems.map((li) => ({ quantity: Number(li.quantity), unitPrice: Number(li.unitPrice) })),
    Number(estimate.taxRate)
  );
  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
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
              {formatEstimateNumber(estimate.number)}
            </p>
            <p className="text-xs uppercase tracking-wide text-neutral-400">{statusLabel[estimate.status]}</p>
          </div>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <p className="text-sm text-neutral-600">{t.publicIntro}</p>

          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{t.quoteFor}</p>
              <p className="mt-1 font-medium text-neutral-900">{estimate.customerName}</p>
              {estimate.customerAddress && (
                <p className="text-sm text-neutral-500">{estimate.customerAddress}</p>
              )}
            </div>
            <div className="text-right text-sm text-neutral-500 tabular-nums">
              <p>
                {t.issued}: {dateFmt.format(estimate.issueDate)}
              </p>
              {estimate.expiryDate && (
                <p>
                  {t.expires}: {dateFmt.format(estimate.expiryDate)}
                </p>
              )}
            </div>
          </div>

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
                {estimate.lineItems.map((li) => (
                  <tr key={li.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-3 py-2 text-neutral-900">{li.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-neutral-600">{Number(li.quantity)}</td>
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

          <div className="ml-auto flex w-full max-w-xs flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">{t.subtotal}</span>
              <span className="tabular-nums text-neutral-900">{money(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">
                {t.tax} ({Number(estimate.taxRate)}%)
              </span>
              <span className="tabular-nums text-neutral-900">{money(totals.tax)}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-2 text-base font-semibold text-neutral-900">
              <span>{t.total}</span>
              <span className="tabular-nums">{money(totals.total)}</span>
            </div>
          </div>

          {estimate.notes && (
            <div>
              <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {t.notes}
              </h2>
              <p className="whitespace-pre-wrap text-sm text-neutral-700">{estimate.notes}</p>
            </div>
          )}

          <div className="border-t border-neutral-100 pt-4">
            {estimate.status === "ACCEPTED" ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-800">
                {t.acceptedThanks}
              </div>
            ) : estimate.status === "DECLINED" ? (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center text-sm text-neutral-600">
                {t.declinedNote}
              </div>
            ) : (
              <EstimateRespondForm token={token} />
            )}
          </div>

          <p className="text-center text-xs text-neutral-400">{t.publicFooter}</p>
        </div>
      </div>
    </main>
  );
}
