"use client";

import type { InvoiceStatus } from "@prisma/client";
import { Ban, RotateCcw, Send, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setInvoiceStatusAction } from "@/actions/invoices";
import { useT } from "@/components/i18n/LocaleProvider";

// The status transitions offered for the current state. Each is a tiny form
// posting the target status to the server action.
function transitionsFor(status: InvoiceStatus): {
  status: InvoiceStatus;
  labelKey: "markSent" | "markPaid" | "reopen" | "voidInvoice";
  icon: typeof Send;
  variant?: "outline" | "destructive";
}[] {
  switch (status) {
    case "DRAFT":
      return [
        { status: "SENT", labelKey: "markSent", icon: Send, variant: "outline" },
        { status: "PAID", labelKey: "markPaid", icon: CheckCircle2 },
        { status: "VOID", labelKey: "voidInvoice", icon: Ban, variant: "outline" },
      ];
    case "SENT":
      return [
        { status: "PAID", labelKey: "markPaid", icon: CheckCircle2 },
        { status: "DRAFT", labelKey: "reopen", icon: RotateCcw, variant: "outline" },
        { status: "VOID", labelKey: "voidInvoice", icon: Ban, variant: "outline" },
      ];
    case "PAID":
    case "VOID":
      return [{ status: "DRAFT", labelKey: "reopen", icon: RotateCcw, variant: "outline" }];
    default:
      return [];
  }
}

export function InvoiceStatusControls({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const t = useT().invoices;
  const transitions = transitionsFor(status);
  if (transitions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((tr) => {
        const Icon = tr.icon;
        return (
          <form key={tr.status} action={setInvoiceStatusAction.bind(null, invoiceId, tr.status)}>
            <Button type="submit" size="sm" variant={tr.variant}>
              <Icon className="h-4 w-4" />
              {t[tr.labelKey]}
            </Button>
          </form>
        );
      })}
    </div>
  );
}
