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

  const isLockedAdmin = currentRole === "ADMIN" && disableDemote;
  const changed = role !== currentRole;

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
        <option value="WORKER">Worker</option>
        <option value="ADMIN">Admin</option>
      </Select>
      {changed && !isLockedAdmin && (
        <ConfirmDialog
          title={
            role === "ADMIN"
              ? "Promote to admin?"
              : "Remove admin access?"
          }
          description={
            role === "ADMIN"
              ? "They'll be able to manage every worker, customer, and record, including deactivating other admins."
              : "They'll lose access to admin tools immediately and be limited to submitting their own work records."
          }
          confirmLabel={role === "ADMIN" ? "Promote to admin" : "Remove admin"}
          trigger={
            <Button type="button" variant="outline" size="sm" disabled={pending}>
              <ShieldCheck className="h-4 w-4" />
              {pending ? "Saving..." : "Update role"}
            </Button>
          }
          onConfirm={() => formRef.current?.requestSubmit()}
        />
      )}
      {isLockedAdmin && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          This is the last active admin, so their role can&apos;t be changed.
        </p>
      )}
      {state?.error && <Alert variant="error">{state.error}</Alert>}
    </form>
  );
}
