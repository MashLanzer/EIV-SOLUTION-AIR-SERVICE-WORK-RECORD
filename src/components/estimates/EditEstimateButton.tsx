"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { EstimateForm } from "@/components/estimates/EstimateForm";
import { useT } from "@/components/i18n/LocaleProvider";

type EstimateFormProps = React.ComponentProps<typeof EstimateForm>;

// Edit an estimate from the detail page in a bottom sheet, matching the rest of
// the app's edit flows. The form redirects on save, which closes the sheet.
export function EditEstimateButton(props: EstimateFormProps) {
  const t = useT().estimates;
  const tc = useT().common;
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" />
        {t.edit}
      </Button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t.editEstimate}
        closeLabel={tc.close}
      >
        <EstimateForm {...props} fullWidth />
      </BottomSheet>
    </>
  );
}
