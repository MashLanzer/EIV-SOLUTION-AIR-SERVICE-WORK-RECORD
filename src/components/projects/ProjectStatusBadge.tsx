"use client";

import type { ProjectStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n/LocaleProvider";

const VARIANT: Record<ProjectStatus, "success" | "secondary" | "warning"> = {
  ACTIVE: "success",
  ON_HOLD: "warning",
  COMPLETED: "secondary",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const t = useT().projects;
  const label: Record<ProjectStatus, string> = {
    ACTIVE: t.statusActive,
    ON_HOLD: t.statusOnHold,
    COMPLETED: t.statusCompleted,
  };
  return <Badge variant={VARIANT[status]}>{label[status]}</Badge>;
}
