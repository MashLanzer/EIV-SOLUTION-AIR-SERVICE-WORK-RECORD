"use client";

import { useActionState, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createWorkerAction, type WorkerFormState } from "@/actions/workers";

export function WorkerForm() {
  const [state, formAction, pending] = useActionState<WorkerFormState, FormData>(
    createWorkerAction,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [role, setRole] = useState<"WORKER" | "ADMIN">("WORKER");

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" required autoFocus />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="name@gmail.com" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="role">Role</Label>
        <Select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value as "WORKER" | "ADMIN")}
        >
          <option value="WORKER">Worker</option>
          <option value="ADMIN">Admin</option>
        </Select>
      </div>
      {state?.error && <Alert variant="error">{state.error}</Alert>}
      {role === "ADMIN" ? (
        <ConfirmDialog
          title="Create an admin account?"
          description="Admins can manage every worker, customer, and record - including deactivating other admins. Only grant this to someone who needs full access."
          confirmLabel="Create admin account"
          confirmVariant="default"
          trigger={
            <Button type="button" disabled={pending}>
              {pending ? "Creating..." : "Create account"}
            </Button>
          }
          onConfirm={() => formRef.current?.requestSubmit()}
        />
      ) : (
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create account"}
        </Button>
      )}
    </form>
  );
}
