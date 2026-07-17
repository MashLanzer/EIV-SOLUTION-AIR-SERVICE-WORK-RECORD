"use client";

import { useState } from "react";
import { Pencil, Wrench } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { useT } from "@/components/i18n/LocaleProvider";

type WorkRecordFormProps = React.ComponentProps<typeof WorkRecordForm>;

// A worker edits (or fixes & resubmits) their own record in a bottom sheet,
// matching the admin flow. Two trigger styles share the same sheet markup; the
// form only mounts while the sheet is open, so rendering both variants on the
// page is cheap. The form redirects on save, which closes the sheet.
export function WorkerRecordEditSheet({
  variant,
  title,
  formProps,
}: {
  variant: "edit" | "resubmit";
  title: string;
  formProps: WorkRecordFormProps;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "edit" ? (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" />
          {t.common.edit}
        </Button>
      ) : (
        <Button type="button" size="lg" className="w-full" onClick={() => setOpen(true)}>
          <Wrench className="h-4 w-4" />
          {t.records.fixAndResubmit}
        </Button>
      )}
      <BottomSheet open={open} onClose={() => setOpen(false)} title={title} closeLabel={t.common.close}>
        <WorkRecordForm {...formProps} />
      </BottomSheet>
    </>
  );
}
