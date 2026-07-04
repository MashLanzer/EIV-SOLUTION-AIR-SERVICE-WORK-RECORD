import Link from "next/link";
import type { WorkRecord } from "@prisma/client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/records/StatusBadge";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function RecordCard({
  record,
  href,
}: {
  record: WorkRecord;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900">
              Job #{record.jobNumber}
            </span>
            <Badge variant="secondary">{formatDate(record.date)}</Badge>
          </div>
          <div className="text-sm text-slate-600">{record.customerName}</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{record.typeOfWork}</span>
            <StatusBadge status={record.status} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
