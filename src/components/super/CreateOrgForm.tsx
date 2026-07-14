"use client";

import { useActionState } from "react";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createOrgAction, type SuperFormState } from "@/actions/superAdmin";

export function CreateOrgForm() {
  const [state, action, pending] = useActionState<SuperFormState, FormData>(
    createOrgAction,
    undefined
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <label htmlFor="name" className="mb-1 block text-sm text-neutral-600 dark:text-neutral-300">
          Company name
        </label>
        <Input id="name" name="name" placeholder="Acme Air Services" required autoFocus />
      </div>
      {state?.error && <p className="text-sm text-destructive-text">{state.error}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          <Building2 className="h-4 w-4" />
          Create company
        </Button>
      </div>
      <p className="text-xs text-neutral-400">
        A unique slug and an invite code are generated automatically. Owners join with the code.
      </p>
    </form>
  );
}
