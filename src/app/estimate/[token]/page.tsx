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
  const initial = (org?.name?.trim()?.[0] ?? "A").toUpperCase();
  const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400";

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-10 print:bg-white print:py-0">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-neutral-200 print:shadow-none print:ring-0">
          <div className="rounded-xl border border-neutral-200 p-7 sm:p-10 print:border-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                {org?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={org.logoUrl} alt="" className="h-11 max-w-[130px] shrink-0 object-contain" />
                ) : (
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-900 text-lg font-semibold text-neutral-900">
                    {initial}
                  </span>
                )}
                <div className="min-w-0">
                  <h1 className="truncate text-[15px] font-semibold tracking-wide text-neutral-900">
                    {org?.name}
                  </h1>
                  {org?.companyPhone ? (
                    <p className="truncate text-xs text-neutral-500">{org.companyPhone}</p>
                  ) : null}
                  {org?.companyAddress ? (
                    <p className="truncate text-xs text-neutral-500">{org.companyAddress}</p>
                  ) : null}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold tracking-[0.24em] text-neutral-900">
                  {t.colNumber.toUpperCase()}
                </div>
                <div className="mt-1 text-xs tracking-widest text-neutral-400">
                  {formatEstimateNumber(estimate.number)}
                </div>
              </div>
            </div>

            <hr className="my-7 border-neutral-200" />

            <p className="mb-7 text-sm text-neutral-600">{t.publicIntro}</p>

            {/* Meta */}
            <div className="mb-8 grid grid-cols-3 gap-4">
              <div>
                <p className={eyebrow}>{t.issued}</p>
                <p className="mt-1 text-sm text-neutral-900">{dateFmt.format(estimate.issueDate)}</p>
              </div>
              {estimate.expiryDate ? (
                <div>
                  <p className={eyebrow}>{t.expires}</p>
                  <p className="mt-1 text-sm text-neutral-900">{dateFmt.format(estimate.expiryDate)}</p>
                </div>
              ) : (
                <div />
              )}
              <div>
                <p className={eyebrow}>{t.colStatus}</p>
                <p className="mt-1 text-sm text-neutral-900">{statusLabel[estimate.status]}</p>
              </div>
            </div>

            {/* Quote for + total */}
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className={eyebrow}>{t.quoteFor}</p>
                <p className="mt-1 text-base font-semibold text-neutral-900">{estimate.customerName}</p>
                {estimate.customerAddress && (
                  <p className="text-sm text-neutral-500">{estimate.customerAddress}</p>
                )}
              </div>
              <div className="w-full max-w-[240px] rounded-xl bg-neutral-50 p-4">
                <p className={eyebrow}>{t.total}</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-neutral-900">
                  {money(totals.total)}
                </p>
                {estimate.expiryDate && (
                  <p className="mt-1 text-xs text-neutral-500">
                    {t.expires}: {dateFmt.format(estimate.expiryDate)}
                  </p>
                )}
              </div>
            </div>

            {/* Line items */}
            <div className="overflow-hidden rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-neutral-900 text-left text-[11px] uppercase tracking-wide text-white">
                    <th className="px-3 py-2.5 font-medium">{t.descriptionPlaceholder}</th>
                    <th className="px-3 py-2.5 text-right font-medium">{t.unitPrice}</th>
                    <th className="px-3 py-2.5 text-right font-medium">{t.qty}</th>
                    <th className="px-3 py-2.5 text-right font-medium">{t.amount}</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.lineItems.map((li) => (
                    <tr key={li.id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-3 py-2.5 text-neutral-900">{li.description}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-neutral-600">
                        {money(Number(li.unitPrice))}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-neutral-600">
                        {Number(li.quantity)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums text-neutral-900">
                        {money(Number(li.quantity) * Number(li.unitPrice))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes + totals */}
            <div className="mt-6 flex flex-wrap justify-between gap-6">
              <div className="min-w-[180px] flex-1">
                {estimate.notes && (
                  <>
                    <p className={eyebrow}>{t.notes}</p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-neutral-600">{estimate.notes}</p>
                  </>
                )}
              </div>
              <div className="w-full max-w-xs">
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-neutral-500">{t.subtotal}</span>
                  <span className="tabular-nums text-neutral-900">{money(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-neutral-500">
                    {t.tax} ({Number(estimate.taxRate)}%)
                  </span>
                  <span className="tabular-nums text-neutral-900">{money(totals.tax)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-lg bg-neutral-900 px-4 py-3 text-white">
                  <span className="text-xs font-semibold uppercase tracking-wide">{t.total}</span>
                  <span className="text-base font-semibold tabular-nums">{money(totals.total)}</span>
                </div>
              </div>
            </div>

            {/* Accept / decline */}
            <div className="mt-8 border-t border-neutral-100 pt-6">
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

            <p className="mt-6 text-center text-xs text-neutral-400">{t.publicFooter}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
