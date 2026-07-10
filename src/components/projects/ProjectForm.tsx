"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  createProjectAction,
  updateProjectAction,
  type ProjectFormState,
} from "@/actions/projects";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/lib/validations";

interface ProjectValues {
  name: string;
  address: string;
  status: string;
}

export function ProjectForm({
  projectId,
  defaultValues,
}: {
  projectId?: string;
  defaultValues?: ProjectValues;
}) {
  const action = projectId
    ? updateProjectAction.bind(null, projectId)
    : createProjectAction;
  const [state, formAction, pending] = useActionState<ProjectFormState, FormData>(
    action,
    undefined
  );
  const err = (name: string) => state?.fieldErrors?.[name]?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name" required>
          Project name
        </Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          placeholder="e.g. 3803 Romano Busciglio St"
          aria-invalid={err("name") ? true : undefined}
        />
        <FieldError id="name-error" message={err("name")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          name="address"
          defaultValue={defaultValues?.address}
          autoComplete="street-address"
          placeholder="Street, city, state"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Used to pin the project on the map (coming soon).
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="status">Status</Label>
        <Select id="status" name="status" defaultValue={defaultValues?.status ?? "ACTIVE"}>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      {state?.error && <Alert variant="error">{state.error}</Alert>}

      <div>
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "Saving..." : projectId ? "Save project" : "Create project"}
        </Button>
      </div>
    </form>
  );
}
