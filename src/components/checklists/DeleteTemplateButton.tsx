"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/LocaleProvider";
import { deleteTemplateAction } from "@/actions/checklists";

export function DeleteTemplateButton({
  templateId,
  templateName,
}: {
  templateId: string;
  templateName: string;
}) {
  const t = useT().checklists;
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deleteTemplateAction.bind(null, templateId)}>
      <ConfirmDialog
        title={t.deleteTitle}
        description={t.deleteDesc.replace("{name}", templateName)}
        confirmLabel={t.deleteConfirm}
        trigger={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={t.deleteAria.replace("{name}", templateName)}
          >
            <Trash2 className="h-4 w-4" />
            {t.deleteConfirm}
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
