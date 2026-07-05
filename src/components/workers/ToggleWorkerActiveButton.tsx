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
  disableDeactivate = false,
}: {
  workerId: string;
  active: boolean;
  name: string;
  // True when this is the last active admin - deactivating them would lock
  // everyone out of admin tools with no way back in but a direct DB edit.
  disableDeactivate?: boolean;
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

  if (disableDeactivate) {
    return (
      <div className="flex flex-col gap-1">
        <Button type="button" variant="destructive" disabled>
          <Ban className="h-4 w-4" />
          Deactivate
        </Button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          This is the last active admin, so they can&apos;t be deactivated.
          Promote another worker to admin first.
        </p>
      </div>
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
