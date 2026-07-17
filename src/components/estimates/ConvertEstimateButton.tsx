"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { convertEstimateToInvoiceAction } from "@/actions/estimates";
import { useT } from "@/components/i18n/LocaleProvider";

// Converting creates an invoice and locks the estimate (read-only), so it
// goes through a confirm step - the same form + ConfirmDialog pattern the
// records approve/delete flows use, with the neutral confirm variant.
export function ConvertEstimateButton({ estimateId }: { estimateId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const t = useT().estimates;

  return (
    <form ref={formRef} action={convertEstimateToInvoiceAction.bind(null, estimateId)}>
      <ConfirmDialog
        title={t.convertTitle}
        description={t.convertDesc}
        confirmLabel={t.convertToInvoice}
        confirmVariant="default"
        trigger={
          <Button type="button" size="sm">
            <ArrowRight className="h-4 w-4" />
            {t.convertToInvoice}
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
