"use client";

import type { WorkRecord } from "@prisma/client";
import { ChevronRight, Clock, Image as ImageIcon } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { DataField } from "@/components/ui/data-field";
import { StatusBadge } from "@/components/records/StatusBadge";
import { useT, useLocale } from "@/components/i18n/LocaleProvider";
import { workDuration } from "@/lib/format";

export function formatRecordDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export type RecordCardData = Pick<
  WorkRecord,
  | "id"
  | "jobNumber"
  | "date"
  | "customerName"
  | "customerAddress"
  | "typeOfWork"
  | "status"
  | "reviewNote"
  | "arrivalTime"
  | "departureTime"
  | "customerRating"
  | "customerFeedback"
> & { photoCount?: number };

// A tap on the card opens a quick-peek bottom sheet (owned by WorkerRecordList)
// instead of navigating, so the worker can triage a record — read the reviewer's
// note in full, see the customer's rating, jump to fix it — without losing their
// place in the list. The peek carries the "open full record" shortcut.
export function RecordCard({
  record,
  onOpen,
}: {
  record: RecordCardData;
  onOpen: (record: RecordCardData) => void;
}) {
  const t = useT().records;
  const locale = useLocale();
  const hours = workDuration(record.arrivalTime, record.departureTime);
  const photoCount = record.photoCount ?? 0;
  return (
    <Card className="transition-colors hover:border-neutral-300 dark:hover:border-neutral-700">
      <button
        type="button"
        onClick={() => onOpen(record)}
        aria-label={t.openRecordAria.replace("{n}", record.jobNumber)}
        className="block w-full text-left transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
      >
        <CardContent className="flex flex-col gap-2.5 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {t.jobNumber}
              {record.jobNumber}
            </span>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={record.status} />
              <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <DataField label={t.date} value={formatRecordDate(record.date, locale)} />
            <DataField label={t.typeOfWork} value={record.typeOfWork} />
            <DataField label={t.customer} value={record.customerName} />
          </div>
          {(hours || photoCount > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {hours && (
                <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  <Clock aria-hidden="true" className="h-3 w-3" />
                  <span className="tabular-nums">{hours}</span>
                </span>
              )}
              {photoCount > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  <ImageIcon aria-hidden="true" className="h-3 w-3" />
                  <span className="tabular-nums">{photoCount}</span>
                </span>
              )}
            </div>
          )}
          {record.status === "NEEDS_CHANGES" && (
            <Alert variant="warning">
              <span className="font-medium">{t.changesRequested}</span>{" "}
              {record.reviewNote || t.tapToSee}
            </Alert>
          )}
        </CardContent>
      </button>
    </Card>
  );
}
