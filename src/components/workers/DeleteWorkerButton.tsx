"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/LocaleProvider";
import { deleteWorkerAction } from "@/actions/workers";

export function DeleteWorkerButton({
  workerId,
  name,
}: {
  workerId: string;
  name: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const t = useT().workers;

  return (
    <form ref={formRef} action={deleteWorkerAction.bind(null, workerId)} className="w-full">
      <ConfirmDialog
        title={t.deleteTitle.replace("{name}", name)}
        description={t.deleteDesc}
        confirmLabel={t.deleteAccount}
        trigger={
          <Button type="button" variant="outline" className="w-full text-destructive-text">
            <Trash2 className="h-4 w-4" />
            {t.deleteAccount}
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
