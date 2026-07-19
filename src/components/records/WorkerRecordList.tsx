"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Image as ImageIcon,
  MapPin,
  Wrench,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { StatusBadge } from "@/components/records/StatusBadge";
import { RecordCard, formatRecordDate, type RecordCardData } from "@/components/records/RecordCard";
import { useT, useLocale } from "@/components/i18n/LocaleProvider";
import { workDuration } from "@/lib/format";

const mapsHref = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

// The worker's record list. Each card opens a quick-peek bottom sheet (one sheet
// shared across the list, keyed by the selected record) so a record can be
// triaged — reviewer note, customer rating, hours — and acted on without
// navigating away and losing scroll/filter position. Mirrors the admin peek
// pattern (CustomerCards / ProjectSummarySheet).
export function WorkerRecordList({ records }: { records: RecordCardData[] }) {
  const t = useT().records;
  const tc = useT().common;
  const locale = useLocale();
  const [peek, setPeek] = useState<RecordCardData | null>(null);

  const hours = peek ? workDuration(peek.arrivalTime, peek.departureTime) : null;
  const photoCount = peek?.photoCount ?? 0;

  return (
    <>
      <div className="flex flex-col gap-3">
        {records.map((record) => (
          <RecordCard key={record.id} record={record} onOpen={setPeek} />
        ))}
      </div>

      <BottomSheet
        open={peek !== null}
        onClose={() => setPeek(null)}
        title={peek ? t.peekTitle.replace("{n}", peek.jobNumber) : ""}
        closeLabel={tc.close}
      >
        {peek && (
          <div className="flex flex-col gap-4">
            {/* Status + date + type */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {formatRecordDate(peek.date, locale)}
                </div>
                <div className="mt-0.5 truncate text-sm text-neutral-500 dark:text-neutral-400">
                  {peek.typeOfWork}
                </div>
              </div>
              <StatusBadge status={peek.status} />
            </div>

            {/* Customer + directions */}
            <a
              href={mapsHref(peek.customerAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-800/50 dark:hover:border-neutral-700"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {peek.customerName}
                </span>
                <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {peek.customerAddress}
                </span>
              </span>
              <span className="shrink-0 self-center text-xs font-medium text-primary">
                {t.directions}
              </span>
            </a>

            {/* Hours + photos */}
            {(hours || photoCount > 0) && (
              <div className="flex flex-wrap items-center gap-2">
                {hours && (
                  <span className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{hours}</span>
                  </span>
                )}
                {photoCount > 0 && (
                  <Link
                    href={`/records/${peek.id}`}
                    className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  >
                    <ImageIcon aria-hidden="true" className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{photoCount}</span>
                  </Link>
                )}
              </div>
            )}

            {/* Reviewer note */}
            {peek.status === "NEEDS_CHANGES" && (
              <Alert variant="warning">
                <span className="font-medium">{t.changesRequested}</span>{" "}
                {peek.reviewNote || t.tapToSee}
              </Alert>
            )}

            {/* Customer rating */}
            {peek.customerRating != null && (
              <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {t.customerRatingLabel}
                  </span>
                  <StarRating rating={peek.customerRating} />
                </div>
                {peek.customerFeedback && (
                  <p className="text-sm text-neutral-700 dark:text-neutral-200">
                    “{peek.customerFeedback}”
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
              {peek.status === "NEEDS_CHANGES" && (
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/records/${peek.id}`}>
                    <Wrench className="h-4 w-4" />
                    {t.fixAndResubmit}
                  </Link>
                </Button>
              )}
              <Button asChild className="w-full">
                <Link href={`/records/${peek.id}`}>
                  {t.viewFullRecord}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
