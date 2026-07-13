"use client";

import { useActionState, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import {
  updateWorkerEmailAction,
  type UpdateWorkerEmailState,
} from "@/actions/workers";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useT } from "@/components/i18n/LocaleProvider";
import { useBeforeUnloadGuard } from "@/hooks/useBeforeUnloadGuard";

export function UpdateWorkerEmailForm({
  userId,
  currentEmail,
}: {
  userId: string;
  currentEmail: string;
}) {
  const [state, formAction, pending] = useActionState<
    UpdateWorkerEmailState,
    FormData
  >(updateWorkerEmailAction.bind(null, userId), undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState(currentEmail);
  const t = useT().workers;
  // Guard against losing an edited (but not yet saved) email on reload/close.
  useBeforeUnloadGuard(email.trim() !== currentEmail && !pending);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <Input
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="sm:max-w-xs"
      />
      <ConfirmDialog
        title={t.changeEmailTitle}
        description={t.changeEmailDesc
          .replace("{email}", email || t.thisAddress)
          .replace("{prev}", currentEmail)}
        confirmLabel={t.updateEmail}
        trigger={
          <Button type="button" variant="outline" size="sm" disabled={pending}>
            <Pencil className="h-4 w-4" />
            {pending ? t.saving : t.updateEmail}
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
      {state?.error && <Alert variant="error">{state.error}</Alert>}
    </form>
  );
}
