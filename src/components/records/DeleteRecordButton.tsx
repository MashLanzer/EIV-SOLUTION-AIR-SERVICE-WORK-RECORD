"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/LocaleProvider";
import { deleteRecordAction } from "@/actions/records";

export function DeleteRecordButton({
  recordId,
  // On the record detail card we want delete de-emphasized (a quiet ghost
  // row), not a loud red square; the list rows keep the compact icon button.
  subtle = false,
}: {
  recordId: string;
  subtle?: boolean;
}) {
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
          subtle ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t.deleteAria}
              className="text-neutral-500 hover:text-destructive dark:text-neutral-400"
            >
              <Trash2 className="h-4 w-4" />
              {tc.delete}
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              aria-label={t.deleteAria}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
