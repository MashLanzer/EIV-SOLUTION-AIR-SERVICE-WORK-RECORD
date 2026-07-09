"use client";

import { useRef } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { approveRecordAction } from "@/actions/records";

// Approving is significant (it locks the record and feeds pay totals), so it
// goes through a confirm step - the same form + ConfirmDialog pattern as
// DeleteRecordButton, but with the neutral (non-destructive) confirm variant.
export function ApproveRecordButton({
  recordId,
  iconOnly = false,
}: {
  recordId: string;
  iconOnly?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={approveRecordAction.bind(null, recordId)}>
      <ConfirmDialog
        title="Approve this record?"
        description="This marks the job as approved and counts it toward pay totals. You can still return it for changes afterwards."
        confirmLabel="Approve"
        confirmVariant="default"
        trigger={
          iconOnly ? (
            <Button type="button" size="icon" aria-label="Approve record">
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" size="sm">
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
          )
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
