"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  createProjectAction,
  updateProjectAction,
  type ProjectFormState,
} from "@/actions/projects";
import { PROJECT_STATUSES } from "@/lib/validations";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@prisma/client";

interface ProjectValues {
  name: string;
  address: string;
  status: string;
  teamId?: string;
  customerId?: string;
}

export function ProjectForm({
  projectId,
  defaultValues,
  teams = [],
  customers = [],
  cancelHref,
  fullWidth = false,
}: {
  projectId?: string;
  defaultValues?: ProjectValues;
  teams?: { id: string; name: string }[];
  customers?: { id: string; name: string }[];
  // When set, shows a Cancel button; leaving with unsaved edits is guarded.
  cancelHref?: string;
  // Stretch the action buttons to full width (for use inside a bottom sheet).
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const action = projectId
    ? updateProjectAction.bind(null, projectId)
    : createProjectAction;
  const [state, formAction, pending] = useActionState<ProjectFormState, FormData>(
    action,
    undefined
  );
  const [dirty, setDirty] = useState(false);
  const err = (name: string) => state?.fieldErrors?.[name]?.[0];
  const t = useT().projects;
  const tc = useT().common;
  const statusLabel: Record<ProjectStatus, string> = {
    ACTIVE: t.statusActive,
    ON_HOLD: t.statusOnHold,
    COMPLETED: t.statusCompleted,
  };

  // Warn before a full page unload (reload / closing the app) when there are
  // unsaved edits. In-app navigation is guarded by the Cancel button below.
  // Submitting clears the guard so the post-save redirect isn't blocked.
  useEffect(() => {
    if (!dirty || pending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, pending]);

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="name" required>
          {t.projectName}
        </Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          placeholder={t.projectNamePlaceholder}
          aria-invalid={err("name") ? true : undefined}
        />
        <FieldError id="name-error" message={err("name")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">{t.address}</Label>
        <Input
          id="address"
          name="address"
          defaultValue={defaultValues?.address}
          autoComplete="street-address"
          placeholder={t.addressPlaceholder}
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {t.addressHint}
        </p>
      </div>

      {customers.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="customerId">
            {t.customer}{" "}
            <span className="font-normal text-neutral-500 dark:text-neutral-400">
              ({tc.optional})
            </span>
          </Label>
          <Select
            id="customerId"
            name="customerId"
            defaultValue={defaultValues?.customerId ?? ""}
          >
            <option value="">{t.noCustomer}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="status">{t.status}</Label>
        <Select id="status" name="status" defaultValue={defaultValues?.status ?? "ACTIVE"}>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel[s]}
            </option>
          ))}
        </Select>
      </div>

      {teams.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="teamId">
            {t.team}{" "}
            <span className="font-normal text-neutral-500 dark:text-neutral-400">
              ({tc.optional})
            </span>
          </Label>
          <Select id="teamId" name="teamId" defaultValue={defaultValues?.teamId ?? ""}>
            <option value="">{t.noTeam}</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {state?.error && <Alert variant="error">{state.error}</Alert>}

      <div className={cn("flex items-center gap-2", fullWidth && "flex-col-reverse items-stretch")}>
        <Button type="submit" disabled={pending} className={cn(fullWidth && "w-full")}>
          <Save className="h-4 w-4" />
          {pending ? t.saving : projectId ? t.saveProject : t.createProject}
        </Button>
        {cancelHref &&
          (dirty ? (
            <ConfirmDialog
              title={t.discardTitle}
              description={t.discardDesc}
              confirmLabel={t.discard}
              trigger={
                <Button type="button" variant="outline" disabled={pending} className={cn(fullWidth && "w-full")}>
                  {tc.cancel}
                </Button>
              }
              onConfirm={() => router.push(cancelHref)}
            />
          ) : (
            <Button type="button" variant="outline" asChild className={cn(fullWidth && "w-full")}>
              <Link href={cancelHref}>{tc.cancel}</Link>
            </Button>
          ))}
      </div>
    </form>
  );
}
