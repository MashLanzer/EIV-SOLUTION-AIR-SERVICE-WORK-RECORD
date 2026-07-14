"use client";

import type { InvoiceStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { useT } from "@/components/i18n/LocaleProvider";

const VARIANT: Record<InvoiceStatus, "secondary" | "warning" | "success"> = {
  DRAFT: "secondary",
  SENT: "warning",
  PAID: "success",
  VOID: "secondary",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const t = useT().invoices;
  const label: Record<InvoiceStatus, string> = {
    DRAFT: t.statusDraft,
    SENT: t.statusSent,
    PAID: t.statusPaid,
    VOID: t.statusVoid,
  };
  return <Badge variant={VARIANT[status]}>{label[status]}</Badge>;
}
