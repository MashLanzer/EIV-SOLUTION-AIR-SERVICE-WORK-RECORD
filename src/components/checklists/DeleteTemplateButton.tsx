"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteTemplateAction } from "@/actions/checklists";

export function DeleteTemplateButton({
  templateId,
  templateName,
}: {
  templateId: string;
  templateName: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deleteTemplateAction.bind(null, templateId)}>
      <ConfirmDialog
        title="Delete this template?"
        description={`"${templateName}" will be removed. Projects that already used it keep their checklist.`}
        confirmLabel="Delete"
        trigger={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Delete template ${templateName}`}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
