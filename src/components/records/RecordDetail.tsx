import type { ReactNode } from "react";
import type { WorkPhoto, WorkRecord } from "@prisma/client";
import { Clock, MapPin } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DataField } from "@/components/ui/data-field";
import { RecordPhotoGrid } from "@/components/records/RecordPhotoGrid";
import { formatMoney, formatTime, workDuration } from "@/lib/format";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
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

export function RecordDetail({
  record,
  currency = "$",
}: {
  record: WorkRecord & { photos?: WorkPhoto[] };
  currency?: string;
}) {
  const hours = workDuration(record.arrivalTime, record.departureTime);
  const leadPay = Number(record.leadInstallerPay);
  const helperPay = record.helperPay != null ? Number(record.helperPay) : 0;
  const total = leadPay + helperPay;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    record.customerAddress
  )}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Customer & job */}
      <Section title="Customer & job">
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
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{record.customerAddress}</span>
          </a>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-neutral-200 dark:border-neutral-800 pt-3">
          <DataField label="Date" value={formatDate(record.date)} />
          <DataField label="Type of Work" value={record.typeOfWork} />
        </div>
      </Section>

      {/* Schedule & crew */}
      <Section title="Schedule & crew">
        <div className="grid grid-cols-2 gap-3">
          <DataField label="Arrival" value={formatTime(record.arrivalTime)} />
          <DataField label="Departure" value={formatTime(record.departureTime)} />
        </div>
        {hours && (
          <div className="flex items-center gap-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-300">
            <Clock className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
            <span>
              Time on site:{" "}
              <span className="font-semibold tabular-nums">{hours}</span>
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 border-t border-neutral-200 dark:border-neutral-800 pt-3">
          <DataField label="Lead Installer" value={record.leadInstallerName} />
          <DataField label="Helper" value={record.helperName} />
        </div>
      </Section>

      {/* Payment */}
      <Section title="Payment">
        <div className="grid grid-cols-2 gap-3">
          <DataField label="Lead Installer Pay" value={formatMoney(leadPay, currency)} />
          <DataField
            label="Helper Pay"
            value={record.helperPay != null ? formatMoney(helperPay, currency) : null}
          />
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-3">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">Total</span>
          <span className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
            {formatMoney(total, currency)}
          </span>
        </div>
      </Section>

      {/* Work performed */}
      <Section title="Work performed / notes">
        <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-200">
          {record.workPerformedNotes}
        </p>
      </Section>

      {/* Photos */}
      {record.photos && record.photos.length > 0 && (
        <Section title={`Photos (${record.photos.length})`}>
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
      <Section title="Signatures">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Customer Signature
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={record.customerSignature}
              alt="Customer signature"
              className="h-28 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white object-contain"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Installer Signature
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={record.installerSignature}
              alt="Installer signature"
              className="h-28 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white object-contain"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
