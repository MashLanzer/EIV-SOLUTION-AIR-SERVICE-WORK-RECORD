import type { RecordStatus } from "@prisma/client";
import { CheckCircle2, Clock3, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: RecordStatus }) {
  if (status === "APPROVED") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </Badge>
    );
  }
  if (status === "NEEDS_CHANGES") {
    return (
      <Badge variant="warning">
        <AlertTriangle className="h-3 w-3" />
        Needs changes
      </Badge>
    );
  }
  return (
    <Badge variant="default">
      <Clock3 className="h-3 w-3" />
      Submitted
    </Badge>
  );
}
