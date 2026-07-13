"use client";

import { useId, useRef } from "react";
import { Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/components/i18n/LocaleProvider";
import { requestChangesAction } from "@/actions/records";

// Sends a record back to the worker with a required note explaining what
// to fix. Uses a native <dialog> so the note can be typed inline - the
// shared ConfirmDialog has no input slot.
export function RequestChangesButton({
  recordId,
  iconOnly = false,
  size = "sm",
  className,
}: {
  recordId: string;
  iconOnly?: boolean;
  size?: "sm" | "lg";
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const action = requestChangesAction.bind(null, recordId);
  const t = useT().adminRecords;
  const tc = useT().common;
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <>
      {iconOnly ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t.returnForChanges}
          onClick={() => dialogRef.current?.showModal()}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size={size}
          className={className}
          onClick={() => dialogRef.current?.showModal()}
        >
          <Undo2 className="h-4 w-4" />
          {t.returnForChanges}
        </Button>
      )}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[calc(100vw-2rem)] max-w-md animate-fade-up rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xl backdrop:bg-black/40"
      >
        <form action={action} onSubmit={() => dialogRef.current?.close()}>
          <h2 id={titleId} className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {t.returnForChanges}
          </h2>
          <p id={descriptionId} className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {t.returnDesc}
          </p>
          <Textarea
            name="reviewNote"
            required
            rows={4}
            className="mt-3"
            placeholder={t.returnPlaceholder}
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => dialogRef.current?.close()}
            >
              {tc.cancel}
            </Button>
            <Button type="submit" variant="destructive">
              <Undo2 className="h-4 w-4" />
              {t.return}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
