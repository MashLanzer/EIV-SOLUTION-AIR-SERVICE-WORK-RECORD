"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/LocaleProvider";
import { deleteEstimateAction } from "@/actions/estimates";

export function DeleteEstimateButton({
  estimateId,
  fullWidth = false,
}: {
  estimateId: string;
  fullWidth?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const t = useT().estimates;
  return (
    <form
      ref={formRef}
      action={deleteEstimateAction.bind(null, estimateId)}
      className={fullWidth ? "w-full" : undefined}
    >
      <ConfirmDialog
        title={t.delete}
        description={t.deleteConfirm}
        confirmLabel={t.delete}
        trigger={
          fullWidth ? (
            <Button type="button" variant="outline" className="w-full text-destructive-text">
              <Trash2 className="h-4 w-4" />
              {t.delete}
            </Button>
          ) : (
            <Button type="button" variant="destructive" size="sm">
              <Trash2 className="h-4 w-4" />
              {t.delete}
            </Button>
          )
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
