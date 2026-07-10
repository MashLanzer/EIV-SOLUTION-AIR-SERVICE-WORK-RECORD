"use client";

import { useId, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetHistoryAction } from "@/actions/records";

const CONFIRM_PHRASE = "RESET";

// Wipes every work record. Guarded by a native <dialog> that only enables the
// destructive button once the exact phrase is typed - the server action
// re-checks the phrase too, so this is UX, not the security boundary.
export function ResetHistoryDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmText, setConfirmText] = useState("");
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const ready = confirmText.trim() === CONFIRM_PHRASE;

  function close() {
    dialogRef.current?.close();
    setConfirmText("");
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Trash2 className="h-4 w-4" />
        Reset all data
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-auto w-[calc(100vw-2rem)] max-w-md animate-fade-up rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xl backdrop:bg-black/40"
      >
        <form action={resetHistoryAction} onSubmit={close}>
          <h2 id={titleId} className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Reset all company data?
          </h2>
          <p id={descriptionId} className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            This permanently deletes{" "}
            <span className="font-medium">everything in your company</span> —
            work records, customers, projects, photos, teams, checklists and
            comments. Only the user accounts (workers and admins) are kept, so
            you stay signed in. This cannot be undone.
          </p>
          <div className="mt-4 flex flex-col gap-1.5">
            <Label htmlFor={`${id}-confirm`}>
              Type <span className="font-semibold">{CONFIRM_PHRASE}</span> to confirm
            </Label>
            <Input
              id={`${id}-confirm`}
              name="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder={CONFIRM_PHRASE}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={!ready}>
              <Trash2 className="h-4 w-4" />
              Reset everything
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
