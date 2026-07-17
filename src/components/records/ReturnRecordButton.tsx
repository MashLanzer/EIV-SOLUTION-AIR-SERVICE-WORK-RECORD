"use client";

import { useState, useTransition } from "react";
import { Undo2 } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requestChangesAction } from "@/actions/records";
import { useT } from "@/components/i18n/LocaleProvider";

// Return a single record for changes straight from the review queue — a
// bottom sheet with the note, so a reviewer never has to open the record just
// to send it back. The note is required (the worker needs to know what to fix).
export function ReturnRecordButton({
  recordId,
  size = "sm",
  variant = "outline",
  className,
}: {
  recordId: string;
  size?: "sm" | "icon";
  variant?: "outline" | "ghost";
  className?: string;
}) {
  const t = useT().reviewQueue;
  const tc = useT().common;
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const value = note.trim();
    if (!value) return;
    const fd = new FormData();
    fd.set("reviewNote", value);
    startTransition(async () => {
      await requestChangesAction(recordId, fd);
      setOpen(false);
      setNote("");
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        aria-label={t.returnAction}
      >
        <Undo2 className="h-4 w-4" />
        {size !== "icon" && t.returnAction}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t.returnTitle} closeLabel={tc.close}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.returnDesc}</p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={t.returnPlaceholder}
            autoFocus
          />
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={pending || !note.trim()}
            className="w-full"
          >
            <Undo2 className="h-4 w-4" />
            {t.returnSubmit}
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
