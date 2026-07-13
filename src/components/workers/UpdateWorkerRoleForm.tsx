"use client";

import { useActionState, useRef, useState } from "react";
import type { Role } from "@prisma/client";
import { ShieldCheck } from "lucide-react";

import {
  updateWorkerRoleAction,
  type UpdateWorkerRoleState,
} from "@/actions/workers";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
import { useT } from "@/components/i18n/LocaleProvider";

export function UpdateWorkerRoleForm({
  userId,
  currentRole,
  disableDemote = false,
}: {
  userId: string;
  currentRole: Role;
  // True when this is the last active admin - demoting them would leave
  // nobody able to manage the admin tools.
  disableDemote?: boolean;
}) {
  const [state, formAction, pending] = useActionState<
    UpdateWorkerRoleState,
    FormData
  >(updateWorkerRoleAction.bind(null, userId), undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState<Role>(currentRole);
  const t = useT().workers;

  const isLockedAdmin = currentRole === "ADMIN" && disableDemote;
  const changed = role !== currentRole;
  // A confirmation is only worth it when admin access is granted or removed;
  // worker <-> supervisor is a low-stakes change and saves directly.
  const involvesAdmin = role === "ADMIN" || currentRole === "ADMIN";

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <Select
        name="role"
        value={role}
        disabled={isLockedAdmin}
        onChange={(e) => setRole(e.target.value as Role)}
        className="sm:max-w-[10rem]"
      >
        <option value="WORKER">{t.roleWorker}</option>
        <option value="SUPERVISOR">{t.roleSupervisor}</option>
        <option value="ADMIN">{t.roleAdmin}</option>
      </Select>
      {changed && !isLockedAdmin && involvesAdmin && (
        <ConfirmDialog
          title={role === "ADMIN" ? t.promoteTitle : t.removeAdminTitle}
          description={role === "ADMIN" ? t.promoteDesc : t.removeAdminDesc}
          confirmLabel={role === "ADMIN" ? t.promoteConfirm : t.removeAdminConfirm}
          trigger={
            <Button type="button" variant="outline" size="sm" disabled={pending}>
              <ShieldCheck className="h-4 w-4" />
              {pending ? t.saving : t.updateRole}
            </Button>
          }
          onConfirm={() => formRef.current?.requestSubmit()}
        />
      )}
      {changed && !isLockedAdmin && !involvesAdmin && (
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          <ShieldCheck className="h-4 w-4" />
          {pending ? t.saving : t.updateRole}
        </Button>
      )}
      {isLockedAdmin && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {t.lastAdminRoleHint}
        </p>
      )}
      {state?.error && <Alert variant="error">{state.error}</Alert>}
    </form>
  );
}
