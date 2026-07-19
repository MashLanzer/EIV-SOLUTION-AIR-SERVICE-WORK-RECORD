"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Copy,
  FolderKanban,
  Image as ImageIcon,
  MapPin,
  Navigation,
  Wrench,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { DataField } from "@/components/ui/data-field";
import { StarRating } from "@/components/ui/star-rating";
import { StatusBadge } from "@/components/records/StatusBadge";
import { RecordCard, formatRecordDate, type RecordCardData } from "@/components/records/RecordCard";
import { useT, useLocale } from "@/components/i18n/LocaleProvider";
import { useUse24Hour } from "@/components/i18n/TimeFormatProvider";
import { formatMoney, formatTime, workDuration } from "@/lib/format";

const mapsHref = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

// The worker's record list. Each card opens a quick-peek bottom sheet (one sheet
// shared across the list, keyed by the selected record) so a record can be
// triaged — status, earnings, crew, hours, reviewer note, rating — and acted on
// without navigating away and losing scroll/filter position. Mirrors the admin
// peek pattern (CustomerCards / ProjectSummarySheet).
export function WorkerRecordList({
  records,
  currency = "$",
}: {
  records: RecordCardData[];
  currency?: string;
}) {
  const t = useT().records;
  const tc = useT().common;
  const locale = useLocale();
  const use24 = useUse24Hour();
  const [peek, setPeek] = useState<RecordCardData | null>(null);

  const hours = peek ? workDuration(peek.arrivalTime, peek.departureTime) : null;
  const photoCount = peek?.photoCount ?? 0;
  const earned = peek?.earned ?? 0;
  const notes = peek?.workPerformedNotes?.trim();

  // Group the current page by recency (Today / This week / This month / Earlier)
  // so a long list reads as dated sections instead of one flat run. Buckets are
  // rendered in the direction that matches the active sort.
  type Bucket = "today" | "week" | "month" | "earlier";
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const startWeek = new Date(startToday);
  startWeek.setDate(startToday.getDate() - ((startToday.getDay() + 6) % 7));
  const startMonth = new Date(startToday.getFullYear(), startToday.getMonth(), 1);
  const bucketOf = (d: Date): Bucket => {
    const ms = d.getTime();
    if (ms >= startToday.getTime()) return "today";
    if (ms >= startWeek.getTime()) return "week";
    if (ms >= startMonth.getTime()) return "month";
    return "earlier";
  };
  const groups: Record<Bucket, RecordCardData[]> = { today: [], week: [], month: [], earlier: [] };
  for (const r of records) groups[bucketOf(new Date(r.date))].push(r);
  const ascending =
    records.length > 1 &&
    new Date(records[0].date).getTime() <= new Date(records[records.length - 1].date).getTime();
  const order: Bucket[] = ascending
    ? ["earlier", "month", "week", "today"]
    : ["today", "week", "month", "earlier"];
  const groupLabels: Record<Bucket, string> = {
    today: t.groupToday,
    week: t.groupThisWeek,
    month: t.groupThisMonth,
    earlier: t.groupEarlier,
  };

  return (
    <>
      <div className="flex flex-col gap-5">
        {order
          .filter((key) => groups[key].length > 0)
          .map((key) => (
            <div key={key} className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {groupLabels[key]}{" "}
                <span className="text-neutral-400 dark:text-neutral-500">({groups[key].length})</span>
              </span>
              {groups[key].map((record) => (
                <RecordCard key={record.id} record={record} onOpen={setPeek} />
              ))}
            </div>
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
            {/* Status + what this record earned the worker */}
            <div className="flex items-center justify-between gap-2">
              <StatusBadge status={peek.status} />
              {earned > 0 && (
                <span className="flex items-baseline gap-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {t.earned}
                  </span>
                  <span className="text-base font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {formatMoney(earned, currency)}
                  </span>
                </span>
              )}
            </div>

            {/* Customer + directions to the job site */}
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
              <span className="flex shrink-0 items-center gap-1 self-center text-xs font-medium text-primary">
                <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                {t.directions}
              </span>
            </a>

            {/* Tagged project — jump straight to it */}
            {peek.projectId && peek.projectName && (
              <Link
                href={`/records/projects/${peek.projectId}`}
                className="inline-flex w-fit items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="text-neutral-500 dark:text-neutral-400">{t.inProjectLabel}:</span>
                <span className="max-w-[12rem] truncate">{peek.projectName}</span>
              </Link>
            )}

            {/* Key facts: date, type, times, crew */}
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/50">
              <DataField label={t.date} value={formatRecordDate(peek.date, locale)} />
              <DataField label={t.typeOfWork} value={peek.typeOfWork} />
              <DataField label={t.arrival} value={formatTime(peek.arrivalTime, use24)} />
              <DataField label={t.departure} value={formatTime(peek.departureTime, use24)} />
              <DataField label={t.leadInstaller} value={peek.leadInstallerName} />
              <DataField label={t.helper} value={peek.helperName} />
            </div>

            {/* Hours on site + photos */}
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
                    href={`/records/${peek.id}#record-photos`}
                    className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  >
                    <ImageIcon aria-hidden="true" className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{photoCount}</span>
                  </Link>
                )}
              </div>
            )}

            {/* Work performed preview */}
            {notes && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {t.workNotes}
                </span>
                <p className="line-clamp-3 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-200">
                  {notes}
                </p>
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
              <Button asChild variant="outline" className="w-full">
                <Link href={`/records/new?from=${peek.id}`}>
                  <Copy className="h-4 w-4" />
                  {t.duplicate}
                </Link>
              </Button>
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
