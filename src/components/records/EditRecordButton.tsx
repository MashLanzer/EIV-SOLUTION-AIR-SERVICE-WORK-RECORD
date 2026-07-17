"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { useT } from "@/components/i18n/LocaleProvider";

type WorkRecordFormProps = React.ComponentProps<typeof WorkRecordForm>;

// Edit a work record from the review page in a bottom sheet, matching the rest
// of the app's edit flows. The form redirects on save, which closes the sheet.
// Rendered as an action tile so it lines up with the other record actions.
export function EditRecordButton({
  tileClassName,
  editLabel,
  title,
  formProps,
}: {
  tileClassName: string;
  editLabel: string;
  title: string;
  formProps: WorkRecordFormProps;
}) {
  const tc = useT().common;
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={tileClassName}>
        <Pencil className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
        <span className="text-[11px] font-medium leading-tight">{editLabel}</span>
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={title} closeLabel={tc.close}>
        <WorkRecordForm {...formProps} />
      </BottomSheet>
    </>
  );
}
