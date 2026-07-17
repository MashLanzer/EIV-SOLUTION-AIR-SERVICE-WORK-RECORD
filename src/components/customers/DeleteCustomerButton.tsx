"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/LocaleProvider";
import { deleteCustomerAction } from "@/actions/customers";

export function DeleteCustomerButton({
  customerId,
  fullWidth = false,
}: {
  customerId: string;
  fullWidth?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const t = useT().customers;
  const tc = useT().common;

  return (
    <form
      ref={formRef}
      action={deleteCustomerAction.bind(null, customerId)}
      className={fullWidth ? "w-full" : undefined}
    >
      <ConfirmDialog
        title={t.deleteTitle}
        description={t.deleteDesc}
        confirmLabel={t.deleteConfirm}
        trigger={
          <Button
            type="button"
            variant="destructive"
            size={fullWidth ? undefined : "sm"}
            className={fullWidth ? "w-full" : undefined}
          >
            <Trash2 className="h-4 w-4" />
            {tc.delete}
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
