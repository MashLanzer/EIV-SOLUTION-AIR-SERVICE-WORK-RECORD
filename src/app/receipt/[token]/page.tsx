import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";

import { ReceiptRatingForm } from "@/components/records/ReceiptRatingForm";
import { prisma } from "@/lib/prisma";
import { qrToSvg } from "@/lib/qr";
import { getLocale, getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

// A set expiry in the past means the link is retired. Kept as a module-level
// helper so the time read stays out of the component render body.
function isExpired(expiresAt: Date | null): boolean {
  return expiresAt != null && expiresAt.getTime() < Date.now();
}

// A public, read-only receipt of a completed service, reachable only via the
// record's unguessable publicToken. No auth: anyone with the link can view it,
// which is the point (the admin shares it with the customer).
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const record = await prisma.workRecord.findFirst({
    where: { publicToken: token },
    include: {
      photos: { orderBy: { position: "asc" }, select: { id: true, dataUrl: true } },
      organization: {
        select: { name: true, logoUrl: true, companyPhone: true, companyAddress: true },
      },
    },
  });
  if (!record) notFound();

  const t = (await getT()).receipt;

  // A set, past expiry retires the link with a friendly notice rather than a
  // bare 404 - the customer knows to ask for a fresh link.
  if (isExpired(record.publicTokenExpiresAt)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100 px-4 py-8">
        <div className="mx-auto max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900">{t.expiredTitle}</h1>
          <p className="mt-2 text-sm text-neutral-500">{t.expiredDesc}</p>
        </div>
      </main>
    );
  }
  const locale = await getLocale();
  const dateStr = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(record.date);
  const org = record.organization;

  // Absolute URL for the QR, resolved from the request host (works behind the
  // proxy). The QR is always dark-on-white for reliable scanning.
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const receiptUrl = host ? `${proto}://${host}/receipt/${token}` : "";
  const qrSvg = receiptUrl ? qrToSvg(receiptUrl, { pixels: 132, dark: "#0a0a0a", light: "#ffffff" }) : "";

  const initial = (org?.name?.trim()?.[0] ?? "A").toUpperCase();
  const eyebrow = "text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400";
  const performedBy = [record.leadInstallerName, record.helperName].filter(Boolean).join(", ");

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
                <div className="text-2xl font-semibold tracking-[0.28em] text-neutral-900">
                  {t.title.toUpperCase()}
                </div>
                <div className="mt-1 text-xs tracking-widest text-neutral-400">
                  {t.job} #{record.jobNumber}
                </div>
              </div>
            </div>

            <hr className="my-7 border-neutral-200" />

            {/* Customer + date */}
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className={eyebrow}>{t.customer}</p>
                <p className="mt-1 text-base font-semibold text-neutral-900">{record.customerName}</p>
                {record.customerAddress && (
                  <p className="text-sm text-neutral-500">{record.customerAddress}</p>
                )}
              </div>
              <div className="text-right">
                <p className={eyebrow}>{t.date}</p>
                <p className="mt-1 text-sm capitalize text-neutral-900">{dateStr}</p>
              </div>
            </div>

            {/* Details */}
            <div className="mb-8 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              <div>
                <p className={eyebrow}>{t.typeOfWork}</p>
                <p className="mt-1 text-sm text-neutral-900">{record.typeOfWork}</p>
              </div>
              <div>
                <p className={eyebrow}>{t.time}</p>
                <p className="mt-1 text-sm tabular-nums text-neutral-900">
                  {record.arrivalTime} – {record.departureTime}
                </p>
              </div>
              {performedBy ? (
                <div>
                  <p className={eyebrow}>{t.performedBy}</p>
                  <p className="mt-1 text-sm text-neutral-900">{performedBy}</p>
                </div>
              ) : null}
            </div>

            {record.workPerformedNotes && (
              <div className="mb-8">
                <p className={eyebrow}>{t.workPerformed}</p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-neutral-600">
                  {record.workPerformedNotes}
                </p>
              </div>
            )}

            {record.photos.length > 0 && (
              <div className="mb-8">
                <p className={`${eyebrow} mb-2`}>{t.photos}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {record.photos.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={p.dataUrl}
                      alt=""
                      className="aspect-square w-full rounded-lg border border-neutral-200 object-cover"
                    />
                  ))}
                </div>
              </div>
            )}

            {record.customerSignature && (
              <div className="mb-8">
                <p className={`${eyebrow} mb-2`}>{t.customerSignature}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={record.customerSignature}
                  alt=""
                  className="h-20 rounded-lg border border-neutral-200 bg-white object-contain p-2"
                />
              </div>
            )}

            {/* Customer satisfaction: rate once, then it's read-only. */}
            {record.customerRating ? (
              <div className="flex flex-col items-center gap-2 rounded-xl bg-neutral-50 p-5 text-center">
                <span className={eyebrow}>{t.yourRating}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={
                        n <= record.customerRating!
                          ? "h-6 w-6 fill-amber-400 text-amber-400"
                          : "h-6 w-6 text-neutral-300"
                      }
                    />
                  ))}
                </div>
                {record.customerFeedback && (
                  <p className="text-sm text-neutral-600">{record.customerFeedback}</p>
                )}
                {record.feedbackResponse && (
                  <div className="mt-1 w-full rounded-lg border border-neutral-200 bg-white p-3 text-left">
                    <div className={eyebrow}>
                      {t.businessReply.replace("{company}", record.organization?.name ?? "")}
                    </div>
                    <p className="mt-1 text-sm text-neutral-600">{record.feedbackResponse}</p>
                  </div>
                )}
              </div>
            ) : (
              <ReceiptRatingForm token={token} />
            )}

            {/* Actions + footer */}
            <div className="mt-8 flex flex-col items-center gap-3 border-t border-neutral-100 pt-6 print:hidden">
              {qrSvg && (
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className="h-32 w-32 rounded-lg border border-neutral-200 bg-white p-1"
                    role="img"
                    aria-label={t.scanToOpen}
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                  <span className="text-xs text-neutral-400">{t.scanToOpen}</span>
                </div>
              )}
              <a
                href={`/receipt/${token}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                {t.downloadPdf}
              </a>
            </div>
            <p className="mt-6 text-center text-xs text-neutral-400">{t.footer}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
