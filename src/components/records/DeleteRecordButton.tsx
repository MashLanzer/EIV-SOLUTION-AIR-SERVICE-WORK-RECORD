"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteRecordAction } from "@/actions/records";

export function DeleteRecordButton({ recordId }: { recordId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deleteRecordAction.bind(null, recordId)}>
      <ConfirmDialog
        title="Delete this record?"
        description="This permanently removes the record, including its signatures and photos. This cannot be undone."
        confirmLabel="Delete"
        trigger={
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label="Delete record"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
