import type { ProjectStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { PROJECT_STATUS_LABELS } from "@/lib/validations";

const VARIANT: Record<ProjectStatus, "success" | "secondary" | "warning"> = {
  ACTIVE: "success",
  ON_HOLD: "warning",
  COMPLETED: "secondary",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={VARIANT[status]}>{PROJECT_STATUS_LABELS[status]}</Badge>;
}
