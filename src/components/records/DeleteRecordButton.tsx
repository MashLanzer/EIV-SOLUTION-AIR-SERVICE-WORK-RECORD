"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/LocaleProvider";
import { deleteRecordAction } from "@/actions/records";

export function DeleteRecordButton({ recordId }: { recordId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const t = useT().adminRecords;
  const tc = useT().common;

  return (
    <form ref={formRef} action={deleteRecordAction.bind(null, recordId)}>
      <ConfirmDialog
        title={t.deleteTitle}
        description={t.deleteDesc}
        confirmLabel={tc.delete}
        trigger={
          <Button
            type="button"
            variant="destructive"
            size="icon"
            aria-label={t.deleteAria}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
