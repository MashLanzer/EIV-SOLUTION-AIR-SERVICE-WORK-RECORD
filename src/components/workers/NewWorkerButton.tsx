"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { WorkerForm } from "@/components/workers/WorkerForm";
import { useT } from "@/components/i18n/LocaleProvider";

// "New worker" as a bottom sheet instead of a separate page. On success the
// create action redirects to the new worker's detail page (closing the sheet).
export function NewWorkerButton({
  teams,
  variant = "default",
  className,
}: {
  teams: { id: string; name: string }[];
  variant?: "default" | "outline";
  className?: string;
}) {
  const t = useT().workers;
  const tc = useT().common;
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t.newWorker}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t.newWorkerTitle} closeLabel={tc.close}>
        <WorkerForm teams={teams} fullWidth />
      </BottomSheet>
    </>
  );
}
