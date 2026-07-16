"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/LocaleProvider";
import { deletePositionAction } from "@/actions/positions";

export function DeletePositionButton({ positionId }: { positionId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const t = useT().roles;
  const tc = useT().common;
  return (
    <form ref={formRef} action={deletePositionAction.bind(null, positionId)} className="w-full">
      <ConfirmDialog
        title={t.deleteTitle}
        description={t.deleteDesc}
        confirmLabel={tc.delete}
        trigger={
          <Button type="button" variant="destructive" className="w-full">
            <Trash2 className="h-4 w-4" />
            {t.deleteRole}
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
