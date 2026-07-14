"use client";

import type { ScheduledJobStatus } from "@prisma/client";
import { CalendarClock, CheckCircle2, PlayCircle, Truck, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n/LocaleProvider";

// The lifecycle chip for a scheduled job. Mirrors the record StatusBadge's
// monochrome-with-semantic-accents approach: neutral while planned, warning
// while a crew is on it, success when done, muted/destructive when called off.
export function ScheduleStatusBadge({ status }: { status: ScheduledJobStatus }) {
  const t = useT().schedule;
  if (status === "EN_ROUTE") {
    return (
      <Badge variant="warning">
        <Truck className="h-3 w-3" />
        {t.statusEnRoute}
      </Badge>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <Badge variant="warning">
        <PlayCircle className="h-3 w-3" />
        {t.statusInProgress}
      </Badge>
    );
  }
  if (status === "DONE") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3" />
        {t.statusDone}
      </Badge>
    );
  }
  if (status === "CANCELED") {
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3" />
        {t.statusCanceled}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <CalendarClock className="h-3 w-3" />
      {t.statusScheduled}
    </Badge>
  );
}
