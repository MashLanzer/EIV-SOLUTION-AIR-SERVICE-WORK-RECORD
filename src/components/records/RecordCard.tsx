"use client";

import Link from "next/link";
import type { WorkRecord } from "@prisma/client";

import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { DataField } from "@/components/ui/data-field";
import { StatusBadge } from "@/components/records/StatusBadge";
import { useT, useLocale } from "@/components/i18n/LocaleProvider";

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export type RecordCardData = Pick<
  WorkRecord,
  "id" | "jobNumber" | "date" | "customerName" | "typeOfWork" | "status" | "reviewNote"
>;

export function RecordCard({
  record,
  href,
}: {
  record: RecordCardData;
  href: string;
}) {
  const t = useT().records;
  const locale = useLocale();
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:border-neutral-300 dark:hover:border-neutral-700">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
              {t.jobNumber}
              {record.jobNumber}
            </span>
            <StatusBadge status={record.status} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DataField label={t.date} value={formatDate(record.date, locale)} />
            <DataField label={t.typeOfWork} value={record.typeOfWork} />
            <DataField label={t.customer} value={record.customerName} />
          </div>
          {record.status === "NEEDS_CHANGES" && (
            <Alert variant="warning">
              <span className="font-medium">{t.changesRequested}</span>{" "}
              {record.reviewNote || t.tapToSee}
            </Alert>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
