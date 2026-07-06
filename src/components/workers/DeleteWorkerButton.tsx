"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteWorkerAction } from "@/actions/workers";

export function DeleteWorkerButton({
  workerId,
  name,
}: {
  workerId: string;
  name: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deleteWorkerAction.bind(null, workerId)}>
      <ConfirmDialog
        title={`Delete ${name}'s account?`}
        description="This permanently removes their account and authorized email from the app. Their submitted work records are kept, but will no longer show who submitted them. This can't be undone."
        confirmLabel="Delete account"
        trigger={
          <Button type="button" variant="destructive" size="sm">
            <Trash2 className="h-4 w-4" />
            Delete account
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
