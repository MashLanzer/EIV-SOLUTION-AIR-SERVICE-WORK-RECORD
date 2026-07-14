"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteOrgAdminAction, type SuperFormState } from "@/actions/superAdmin";

export function InviteAdminForm({ orgId }: { orgId: string }) {
  const [state, action, pending] = useActionState<SuperFormState, FormData>(
    inviteOrgAdminAction.bind(null, orgId),
    undefined
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Invite admin
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          Creates an admin account. They sign in with this Google email — no join code needed.
        </p>
      </div>
      <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="inv-name" className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
            Name
          </label>
          <Input id="inv-name" name="name" placeholder="Jane Doe" required />
        </div>
        <div className="flex-1">
          <label htmlFor="inv-email" className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
            Email
          </label>
          <Input id="inv-email" name="email" type="email" placeholder="jane@company.com" required />
        </div>
        <Button type="submit" disabled={pending}>
          <UserPlus className="h-4 w-4" />
          Invite
        </Button>
      </form>
      {state?.error && <p className="text-xs text-destructive-text">{state.error}</p>}
    </div>
  );
}
