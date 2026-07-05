"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteCustomerAction } from "@/actions/customers";

export function DeleteCustomerButton({ customerId }: { customerId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deleteCustomerAction.bind(null, customerId)}>
      <ConfirmDialog
        title="Delete this customer?"
        description="Their saved contact details are removed. Existing work records are kept but will no longer be linked to a saved customer."
        confirmLabel="Delete customer"
        trigger={
          <Button type="button" variant="destructive" size="sm">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
