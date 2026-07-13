"use client";

import { useRef } from "react";
import { Ban, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/LocaleProvider";
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
  const t = useT().workers;

  // Reactivating is harmless - no confirmation needed.
  if (!active) {
    return (
      <form action={toggleWorkerActiveAction.bind(null, workerId)}>
        <Button type="submit">
          <CheckCircle2 className="h-4 w-4" />
          {t.reactivate}
        </Button>
      </form>
    );
  }

  if (disableDeactivate) {
    return (
      <div className="flex flex-col gap-1">
        <Button type="button" variant="destructive" disabled>
          <Ban className="h-4 w-4" />
          {t.deactivate}
        </Button>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {t.lastAdminDeactivateHint}
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={toggleWorkerActiveAction.bind(null, workerId)}>
      <ConfirmDialog
        title={t.deactivateTitle.replace("{name}", name)}
        description={t.deactivateDesc}
        confirmLabel={t.deactivate}
        trigger={
          <Button type="button" variant="destructive">
            <Ban className="h-4 w-4" />
            {t.deactivate}
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
