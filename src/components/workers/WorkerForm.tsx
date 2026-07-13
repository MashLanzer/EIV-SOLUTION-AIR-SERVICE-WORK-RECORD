"use client";

import { useActionState, useRef, useState } from "react";
import { Shield, User } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkerAction, type WorkerFormState } from "@/actions/workers";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export function WorkerForm({
  teams = [],
}: {
  teams?: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<WorkerFormState, FormData>(
    createWorkerAction,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState<"WORKER" | "ADMIN">("WORKER");
  const t = useT().workers;
  const tc = useT().common;

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">{t.fullName}</Label>
        <Input id="name" name="name" required autoFocus />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t.email}</Label>
        <Input id="email" name="email" type="email" placeholder="name@gmail.com" required />
      </div>

      {/* Role as a segmented toggle - clearer than a dropdown for two options */}
      <div className="flex flex-col gap-2">
        <Label>{t.role}</Label>
        <input type="hidden" name="role" value={role} />
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900 p-1">
          {([
            { value: "WORKER", label: t.roleWorker, icon: User, hint: t.workerHint },
            { value: "ADMIN", label: t.roleAdmin, icon: Shield, hint: t.adminHint },
          ] as const).map((opt) => {
            const active = role === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                aria-pressed={active}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                )}
              >
                <span className="flex items-center gap-1.5">
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </span>
                <span className="text-xs font-normal text-neutral-400 dark:text-neutral-500">
                  {opt.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {teams.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>
            {t.teams}{" "}
            <span className="font-normal text-neutral-400 dark:text-neutral-500">
              ({tc.optional})
            </span>
          </Label>
          <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-800">
            {teams.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm"
              >
                <input type="checkbox" name="teamId" value={t.id} className="h-4 w-4 shrink-0" />
                <span className="text-neutral-800 dark:text-neutral-200">{t.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {role === "ADMIN" ? (
        <ConfirmDialog
          title={t.createAdminTitle}
          description={t.createAdminDesc}
          confirmLabel={t.createAdminConfirm}
          confirmVariant="default"
          trigger={
            <Button type="button" disabled={pending}>
              {pending ? t.creating : t.createAccount}
            </Button>
          }
          onConfirm={() => formRef.current?.requestSubmit()}
        />
      ) : (
        <Button type="submit" disabled={pending}>
          {pending ? t.creating : t.createAccount}
        </Button>
      )}
    </form>
  );
}
