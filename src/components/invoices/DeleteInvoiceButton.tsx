"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/LocaleProvider";
import { deleteInvoiceAction } from "@/actions/invoices";

export function DeleteInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const t = useT().invoices;

  return (
    <form ref={formRef} action={deleteInvoiceAction.bind(null, invoiceId)}>
      <ConfirmDialog
        title={t.delete}
        description={t.deleteConfirm}
        confirmLabel={t.delete}
        trigger={
          <Button type="button" variant="destructive" size="sm">
            <Trash2 className="h-4 w-4" />
            {t.delete}
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
