"use client";

import { useActionState } from "react";
import { Pencil } from "lucide-react";

import {
  updateWorkerEmailAction,
  type UpdateWorkerEmailState,
} from "@/actions/workers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        name="email"
        type="email"
        defaultValue={currentEmail}
        required
        className="sm:max-w-xs"
      />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <Pencil className="h-4 w-4" />
        {pending ? "Saving..." : "Update email"}
      </Button>
      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
