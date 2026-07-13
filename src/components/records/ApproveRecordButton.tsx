"use client";

import { useRef } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/LocaleProvider";
import { approveRecordAction } from "@/actions/records";

// Approving is significant (it locks the record and feeds pay totals), so it
// goes through a confirm step - the same form + ConfirmDialog pattern as
// DeleteRecordButton, but with the neutral (non-destructive) confirm variant.
export function ApproveRecordButton({
  recordId,
  iconOnly = false,
  size = "sm",
  className,
}: {
  recordId: string;
  iconOnly?: boolean;
  size?: "sm" | "lg";
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const t = useT().adminRecords;

  return (
    <form
      ref={formRef}
      action={approveRecordAction.bind(null, recordId)}
      className={className}
    >
      <ConfirmDialog
        title={t.approveTitle}
        description={t.approveDesc}
        confirmLabel={t.approve}
        confirmVariant="default"
        trigger={
          iconOnly ? (
            <Button type="button" size="icon" aria-label={t.approveAria}>
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" size={size} className="w-full">
              <CheckCircle2 className="h-4 w-4" />
              {t.approve}
            </Button>
          )
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
