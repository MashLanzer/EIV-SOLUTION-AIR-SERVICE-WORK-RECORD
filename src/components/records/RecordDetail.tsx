import type { ReactNode } from "react";
import type { WorkPhoto, WorkRecord } from "@prisma/client";
import { Clock, Mail, MapPin, MessageSquare, Phone } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DataField } from "@/components/ui/data-field";
import { StarRating } from "@/components/ui/star-rating";
import { RecordPhotoGrid } from "@/components/records/RecordPhotoGrid";
import { formatMoney, formatTime, workDuration } from "@/lib/format";
import { getUse24Hour } from "@/lib/timeFormat";
import { getLocale, getT } from "@/lib/i18n/server";

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

// A titled block within the detail - gives each group of fields its own card
// with an eyebrow, so the record reads as sections instead of one flat grid.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {title}
        </span>
        {children}
      </CardContent>
    </Card>
  );
}

export async function RecordDetail({
  record,
  currency = "$",
  showCustomerContact = true,
}: {
  record: WorkRecord & {
    photos?: WorkPhoto[];
    customer?: { phone: string | null; email: string | null } | null;
  };
  currency?: string;
  // Call/email the customer is a company action — workers get directions only,
  // so the worker detail passes false. Defaults to true for the admin review.
  showCustomerContact?: boolean;
}) {
  const t = (await getT()).records;
  const locale = await getLocale();
  const use24 = record.organizationId ? await getUse24Hour(record.organizationId) : false;
  const hours = workDuration(record.arrivalTime, record.departureTime);
  const leadPay = Number(record.leadInstallerPay);
  const helperPay = record.helperPay != null ? Number(record.helperPay) : 0;
  const total = leadPay + helperPay;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    record.customerAddress
  )}`;
  const phone = record.customer?.phone?.trim();
  const email = record.customer?.email?.trim();

  return (
    <div className="flex flex-col gap-4">
      {/* Customer & job */}
      <Section title={t.customerAndJob}>
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {record.customerName}
          </span>
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-fit items-start gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary"
          >
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{record.customerAddress}</span>
          </a>
          {showCustomerContact && (phone || email) && (
            <div className="mt-1 flex flex-wrap gap-2">
              {phone && (
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.callCustomer}
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.emailCustomer}
                </a>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-neutral-200 dark:border-neutral-800 pt-3">
          <DataField label={t.date} value={formatDate(record.date, locale)} />
          <DataField label={t.typeOfWork} value={record.typeOfWork} />
        </div>
      </Section>

      {/* Customer satisfaction — shown once the customer rates the visit from
          the public receipt. Motivating for the crew and otherwise unseen. */}
      {record.customerRating != null && (
        <Section title={t.customerFeedbackTitle}>
          <div className="flex items-center gap-2">
            <StarRating rating={record.customerRating} />
            <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {record.customerRating}/5
            </span>
          </div>
          {record.customerFeedback && (
            <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-200">
              “{record.customerFeedback}”
            </p>
          )}
          {record.feedbackResponse && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                {t.officeReply}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-200">
                {record.feedbackResponse}
              </p>
            </div>
          )}
        </Section>
      )}

      {/* Schedule & crew */}
      <Section title={t.scheduleCrew}>
        <div className="grid grid-cols-2 gap-3">
          <DataField label={t.arrival} value={formatTime(record.arrivalTime, use24)} />
          <DataField label={t.departure} value={formatTime(record.departureTime, use24)} />
        </div>
        {hours && (
          <div className="flex items-center gap-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300">
            <Clock className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
            <span>
              {t.timeOnSite}{" "}
              <span className="font-semibold tabular-nums">{hours}</span>
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 border-t border-neutral-200 dark:border-neutral-800 pt-3">
          <DataField label={t.leadInstaller} value={record.leadInstallerName} />
          <DataField label={t.helper} value={record.helperName} />
        </div>
      </Section>

      {/* Payment */}
      <Section title={t.payment}>
        <div className="grid grid-cols-2 gap-3">
          <DataField label={t.leadInstallerPay} value={formatMoney(leadPay, currency)} />
          <DataField
            label={t.helperPay}
            value={record.helperPay != null ? formatMoney(helperPay, currency) : null}
          />
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-3">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">{t.total}</span>
          <span className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {formatMoney(total, currency)}
          </span>
        </div>
      </Section>

      {/* Work performed */}
      <Section title={t.workNotes}>
        <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-200">
          {record.workPerformedNotes}
        </p>
      </Section>

      {/* Photos */}
      {record.photos && record.photos.length > 0 && (
        <Section title={t.photosCount.replace("{n}", String(record.photos.length))}>
          <RecordPhotoGrid
            photos={record.photos.map((p) => ({
              id: p.id,
              dataUrl: p.dataUrl,
              position: p.position,
            }))}
          />
        </Section>
      )}

      {/* Signatures */}
      <Section title={t.signatures}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {t.customerSignature}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={record.customerSignature}
              alt={t.customerSignature}
              loading="lazy"
              className="h-28 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white object-contain"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {t.installerSignature}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={record.installerSignature}
              alt={t.installerSignature}
              loading="lazy"
              className="h-28 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white object-contain"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
