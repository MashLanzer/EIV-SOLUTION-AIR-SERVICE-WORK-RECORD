"use client";

import { useActionState, useTransition } from "react";
import { KeyRound, Pause, Play, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  deleteOrgAction,
  regenerateJoinCodeAction,
  renameOrgAction,
  setOrgActiveAction,
  type SuperFormState,
} from "@/actions/superAdmin";

export function OrgLifecycleControls({
  orgId,
  name,
  active,
}: {
  orgId: string;
  name: string;
  active: boolean;
}) {
  const [state, renameAction, renaming] = useActionState<SuperFormState, FormData>(
    renameOrgAction.bind(null, orgId),
    undefined
  );
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Manage company
      </h2>

      {/* Rename */}
      <form action={renameAction} className="flex flex-col gap-1.5">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="org-name" className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
              Company name
            </label>
            <Input id="org-name" name="name" defaultValue={name} required />
          </div>
          <Button type="submit" variant="outline" disabled={renaming}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
        {state?.error && <p className="text-xs text-destructive-text">{state.error}</p>}
      </form>

      <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
        {/* Suspend / reactivate */}
        {active ? (
          <ConfirmDialog
            title="Suspend this company?"
            description="Its members will be signed out and blocked from signing in until you reactivate it. Data is kept."
            confirmLabel="Suspend"
            trigger={
              <Button type="button" variant="outline" disabled={pending}>
                <Pause className="h-4 w-4" />
                Suspend
              </Button>
            }
            onConfirm={() => startTransition(() => setOrgActiveAction(orgId, false))}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => startTransition(() => setOrgActiveAction(orgId, true))}
          >
            <Play className="h-4 w-4" />
            Reactivate
          </Button>
        )}

        {/* Regenerate join code */}
        <ConfirmDialog
          title="Regenerate join code?"
          description="The current code stops working immediately. Anyone mid-signup with the old code will need the new one."
          confirmLabel="Regenerate"
          trigger={
            <Button type="button" variant="outline" disabled={pending}>
              <KeyRound className="h-4 w-4" />
              New join code
            </Button>
          }
          onConfirm={() => startTransition(() => regenerateJoinCodeAction(orgId))}
        />

        {/* Delete — only when suspended */}
        {!active && (
          <ConfirmDialog
            title="Delete this company forever?"
            description="This permanently removes the company and ALL its data — users, records, invoices, photos. This cannot be undone."
            confirmLabel="Delete forever"
            trigger={
              <Button type="button" variant="ghost" disabled={pending} className="text-destructive-text">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            }
            onConfirm={() => startTransition(() => deleteOrgAction(orgId))}
          />
        )}
      </div>
      {active && (
        <p className="text-xs text-neutral-400">Suspend the company first to enable deletion.</p>
      )}
    </div>
  );
}
