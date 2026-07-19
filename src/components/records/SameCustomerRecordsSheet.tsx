"use client";

import { useState } from "react";
import Link from "next/link";
import type { RecordStatus } from "@prisma/client";
import { ChevronRight, ClipboardList } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { StatusBadge } from "@/components/records/StatusBadge";
import { useT, useLocale } from "@/components/i18n/LocaleProvider";

export interface SameCustomerRecord {
  id: string;
  jobNumber: string;
  date: Date;
  typeOfWork: string;
  status: RecordStatus;
}

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

// A shortcut on a record's detail to the worker's other visits to the same
// customer, without going back to search: opens a bottom sheet listing them,
// each a link into that record. Mirrors the admin peek-sheet record lists.
export function SameCustomerRecordsSheet({
  customerName,
  records,
}: {
  customerName: string;
  records: SameCustomerRecord[];
}) {
  const t = useT().records;
  const tc = useT().common;
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  if (records.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
        {t.sameCustomerCta}
        <span className="tabular-nums text-neutral-500 dark:text-neutral-400">· {records.length}</span>
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t.sameCustomerTitle.replace("{name}", customerName)}
        closeLabel={tc.close}
      >
        <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {records.map((r) => (
            <Link
              key={r.id}
              href={`/records/${r.id}`}
              className="group flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
                    {t.jobNumber}
                    {r.jobNumber}
                  </span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {formatDate(r.date, locale)} · {r.typeOfWork}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-500 dark:text-neutral-600 dark:group-hover:text-neutral-400" />
            </Link>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
