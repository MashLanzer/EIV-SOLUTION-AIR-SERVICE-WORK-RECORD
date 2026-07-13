"use client";

import type { RecordStatus } from "@prisma/client";
import { CheckCircle2, Clock3, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n/LocaleProvider";

export function StatusBadge({ status }: { status: RecordStatus }) {
  const t = useT().records;
  if (status === "APPROVED") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3" />
        {t.statusApproved}
      </Badge>
    );
  }
  if (status === "NEEDS_CHANGES") {
    return (
      <Badge variant="warning">
        <AlertTriangle className="h-3 w-3" />
        {t.statusNeedsChanges}
      </Badge>
    );
  }
  return (
    <Badge variant="default">
      <Clock3 className="h-3 w-3" />
      {t.statusSubmitted}
    </Badge>
  );
}
