import type { RecordStatus } from "@prisma/client";
import { CheckCircle2, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: RecordStatus }) {
  if (status === "APPROVED") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Approved
      </Badge>
    );
  }
  return (
    <Badge variant="default" className="gap-1">
      <Clock3 className="h-3 w-3" />
      Submitted
    </Badge>
  );
}
