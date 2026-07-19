"use client";

import type { WorkRecord } from "@prisma/client";
import { AlertTriangle, ChevronRight, ClipboardList, Clock, Image as ImageIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
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
  | "leadInstallerName"
  | "helperName"
  | "workPerformedNotes"
> & {
  photoCount?: number;
  earned?: number;
  projectId?: string | null;
  projectName?: string | null;
};

// A tap on the card opens a quick-peek bottom sheet (owned by WorkerRecordList)
// instead of navigating, so the worker can triage a record — read the reviewer's
// note in full, see the customer's rating, jump to fix it — without losing their
// place in the list. The peek carries the "open full record" shortcut.
//
// Layout mirrors the admin record card (leading icon tile, job number + status
// on top, customer prominent, a "date · type" line, hours/photos pills) so the
// two sides of the app read as one product.
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
    <Card className="overflow-hidden transition-colors hover:border-neutral-300 dark:hover:border-neutral-700">
      <button
        type="button"
        onClick={() => onOpen(record)}
        aria-label={t.openRecordAria.replace("{n}", record.jobNumber)}
        className="flex w-full items-start gap-3 p-3 text-left transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
          <ClipboardList aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {t.jobNumber}
              {record.jobNumber}
            </span>
            <StatusBadge status={record.status} />
          </div>
          <div className="mt-0.5 truncate text-sm text-neutral-900 dark:text-neutral-100">
            {record.customerName}
          </div>
          <div className="mt-0.5 truncate text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
            {formatRecordDate(record.date, locale)} · {record.typeOfWork}
          </div>
          {(hours || photoCount > 0) && (
            <div className="mt-1 flex flex-wrap items-center gap-2">
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
            <div className="mt-1 flex items-start gap-1.5 rounded-lg bg-warning-soft px-2.5 py-1.5 text-xs text-warning-text">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <span className="font-semibold">{t.resubmitNeeded}</span>
                {" — "}
                {record.reviewNote || t.tapToSee}
              </span>
            </div>
          )}
        </div>
        <ChevronRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
      </button>
    </Card>
  );
}
