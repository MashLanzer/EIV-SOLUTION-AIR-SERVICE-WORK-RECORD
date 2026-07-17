"use client";

import { useRef } from "react";
import type { InvoiceStatus } from "@prisma/client";
import { Ban, RotateCcw, Send, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { setInvoiceStatusAction } from "@/actions/invoices";
import { useT } from "@/components/i18n/LocaleProvider";

type LabelKey = "markSent" | "markPaid" | "reopen" | "voidInvoice";

// The status transitions offered for the current state. `confirm` marks the
// ones significant enough to double-check (voiding locks the invoice).
function transitionsFor(status: InvoiceStatus): {
  status: InvoiceStatus;
  labelKey: LabelKey;
  icon: typeof Send;
  variant?: "outline" | "destructive";
  confirm?: boolean;
}[] {
  switch (status) {
    case "DRAFT":
      return [
        { status: "SENT", labelKey: "markSent", icon: Send, variant: "outline" },
        { status: "PAID", labelKey: "markPaid", icon: CheckCircle2 },
        { status: "VOID", labelKey: "voidInvoice", icon: Ban, variant: "outline", confirm: true },
      ];
    case "SENT":
      return [
        { status: "PAID", labelKey: "markPaid", icon: CheckCircle2 },
        { status: "DRAFT", labelKey: "reopen", icon: RotateCcw, variant: "outline" },
        { status: "VOID", labelKey: "voidInvoice", icon: Ban, variant: "outline", confirm: true },
      ];
    case "PAID":
    case "VOID":
      return [{ status: "DRAFT", labelKey: "reopen", icon: RotateCcw, variant: "outline" }];
    default:
      return [];
  }
}

// A single transition: a tiny form posting the target status. Significant
// transitions (void) go through a ConfirmDialog first; the rest submit on tap.
function TransitionButton({
  invoiceId,
  target,
  label,
  Icon,
  variant,
  confirm,
  confirmTitle,
  confirmDesc,
}: {
  invoiceId: string;
  target: InvoiceStatus;
  label: string;
  Icon: typeof Send;
  variant?: "outline" | "destructive";
  confirm?: boolean;
  confirmTitle: string;
  confirmDesc: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={setInvoiceStatusAction.bind(null, invoiceId, target)}>
      {confirm ? (
        <ConfirmDialog
          title={confirmTitle}
          description={confirmDesc}
          confirmLabel={label}
          confirmVariant="destructive"
          trigger={
            <Button type="button" size="sm" variant={variant}>
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          }
          onConfirm={() => formRef.current?.requestSubmit()}
        />
      ) : (
        <Button type="submit" size="sm" variant={variant}>
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      )}
    </form>
  );
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
      {transitions.map((tr) => (
        <TransitionButton
          key={tr.status}
          invoiceId={invoiceId}
          target={tr.status}
          label={t[tr.labelKey]}
          Icon={tr.icon}
          variant={tr.variant}
          confirm={tr.confirm}
          confirmTitle={t.voidTitle}
          confirmDesc={t.voidDesc}
        />
      ))}
    </div>
  );
}
