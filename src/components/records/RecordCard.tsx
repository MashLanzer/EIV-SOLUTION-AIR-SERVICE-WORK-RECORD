import Link from "next/link";
import type { WorkRecord } from "@prisma/client";

import { Card, CardContent } from "@/components/ui/card";
import { DataField } from "@/components/ui/data-field";
import { StatusBadge } from "@/components/records/StatusBadge";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export type RecordCardData = Pick<
  WorkRecord,
  "id" | "jobNumber" | "date" | "customerName" | "typeOfWork" | "status"
>;

export function RecordCard({
  record,
  href,
}: {
  record: RecordCardData;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              Job #{record.jobNumber}
            </span>
            <StatusBadge status={record.status} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DataField label="Date" value={formatDate(record.date)} />
            <DataField label="Type of Work" value={record.typeOfWork} />
            <DataField label="Customer" value={record.customerName} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
