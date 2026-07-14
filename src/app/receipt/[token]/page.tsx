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

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-neutral-100 py-2 last:border-0 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-900 sm:text-right">{value}</span>
    </div>
  );
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

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        {/* Company header */}
        <div className="flex items-center gap-4 border-b border-neutral-200 p-6">
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

        <div className="flex flex-col gap-6 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {t.title}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">
              {t.job} #{record.jobNumber}
            </p>
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <ReceiptRow label={t.date} value={dateStr} />
            <ReceiptRow label={t.customer} value={record.customerName} />
            {record.customerAddress && <ReceiptRow label={t.address} value={record.customerAddress} />}
            <ReceiptRow label={t.typeOfWork} value={record.typeOfWork} />
            <ReceiptRow label={t.time} value={`${record.arrivalTime} – ${record.departureTime}`} />
            <ReceiptRow
              label={t.performedBy}
              value={[record.leadInstallerName, record.helperName].filter(Boolean).join(", ")}
            />
          </div>

          {record.workPerformedNotes && (
            <div>
              <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {t.workPerformed}
              </h2>
              <p className="whitespace-pre-wrap text-sm text-neutral-700">
                {record.workPerformedNotes}
              </p>
            </div>
          )}

          {record.photos.length > 0 && (
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {t.photos}
              </h2>
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
            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {t.customerSignature}
              </h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={record.customerSignature}
                alt=""
                className="h-24 rounded-lg border border-neutral-200 bg-white object-contain p-2"
              />
            </div>
          )}

          {/* Customer satisfaction: rate once, then it's read-only. */}
          {record.customerRating ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-center">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {t.yourRating}
              </span>
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
            </div>
          ) : (
            <ReceiptRatingForm token={token} />
          )}

          <div className="flex flex-col items-center gap-3 border-t border-neutral-100 pt-4">
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {t.downloadPdf}
            </a>
            <p className="text-center text-xs text-neutral-400">{t.footer}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
