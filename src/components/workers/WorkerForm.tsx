"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createWorkerAction, type WorkerFormState } from "@/actions/workers";

export function WorkerForm() {
  const [state, formAction, pending] = useActionState<WorkerFormState, FormData>(
    createWorkerAction,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
        <Select id="role" name="role" defaultValue="WORKER">
          <option value="WORKER">Worker</option>
          <option value="ADMIN">Admin</option>
        </Select>
      </div>
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create account"}
      </Button>
    </form>
  );
}
