"use client";

import { useRef } from "react";
import { Ban, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toggleWorkerActiveAction } from "@/actions/workers";

export function ToggleWorkerActiveButton({
  workerId,
  active,
  name,
}: {
  workerId: string;
  active: boolean;
  name: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  // Reactivating is harmless - no confirmation needed.
  if (!active) {
    return (
      <form action={toggleWorkerActiveAction.bind(null, workerId)}>
        <Button type="submit">
          <CheckCircle2 className="h-4 w-4" />
          Reactivate
        </Button>
      </form>
    );
  }

  return (
    <form ref={formRef} action={toggleWorkerActiveAction.bind(null, workerId)}>
      <ConfirmDialog
        title={`Deactivate ${name}?`}
        description="They won't be able to sign in anymore. Their submitted records are kept, and you can reactivate them at any time."
        confirmLabel="Deactivate"
        trigger={
          <Button type="button" variant="destructive">
            <Ban className="h-4 w-4" />
            Deactivate
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
