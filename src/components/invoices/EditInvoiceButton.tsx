"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { useT } from "@/components/i18n/LocaleProvider";

type InvoiceFormProps = React.ComponentProps<typeof InvoiceForm>;

// Edit an invoice from the detail page in a bottom sheet, matching the rest of
// the app's edit flows. The form redirects on save, which closes the sheet.
export function EditInvoiceButton(props: InvoiceFormProps) {
  const t = useT().invoices;
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
        title={t.editInvoice}
        closeLabel={tc.close}
      >
        <InvoiceForm {...props} fullWidth />
      </BottomSheet>
    </>
  );
}
