"use client";

import type { EstimateStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n/LocaleProvider";

const VARIANT: Record<EstimateStatus, "secondary" | "warning" | "success" | "destructive"> = {
  DRAFT: "secondary",
  SENT: "warning",
  ACCEPTED: "success",
  DECLINED: "destructive",
};

export function EstimateStatusBadge({ status }: { status: EstimateStatus }) {
  const t = useT().estimates;
  const label: Record<EstimateStatus, string> = {
    DRAFT: t.statusDraft,
    SENT: t.statusSent,
    ACCEPTED: t.statusAccepted,
    DECLINED: t.statusDeclined,
  };
  return <Badge variant={VARIANT[status]}>{label[status]}</Badge>;
}
