"use client";

import { useRef } from "react";
import { Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requestChangesAction } from "@/actions/records";

// Sends a record back to the worker with a required note explaining what
// to fix. Uses a native <dialog> so the note can be typed inline - the
// shared ConfirmDialog has no input slot.
export function RequestChangesButton({ recordId }: { recordId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const action = requestChangesAction.bind(null, recordId);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Undo2 className="h-4 w-4" />
        Return for changes
      </Button>
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[calc(100vw-2rem)] max-w-md animate-fade-up rounded-lg border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-black/40"
      >
        <form action={action} onSubmit={() => dialogRef.current?.close()}>
          <h2 className="text-base font-semibold text-slate-900">
            Return for changes
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Explain what needs fixing. The worker will see this note and can
            edit and resubmit the record.
          </p>
          <Textarea
            name="reviewNote"
            required
            rows={4}
            className="mt-3"
            placeholder="e.g. The customer address is wrong and the installer signature is missing."
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive">
              <Undo2 className="h-4 w-4" />
              Return
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
