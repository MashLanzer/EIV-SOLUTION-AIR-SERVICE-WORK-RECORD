"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { CustomerEditForm } from "@/components/customers/CustomerEditForm";
import { useT } from "@/components/i18n/LocaleProvider";

interface CustomerValues {
  name: string;
  address: string;
  phone: string;
  email: string;
}

// Edit a customer from the detail page in a bottom sheet, matching the rest of
// the app's edit flows. The form redirects on save, which closes the sheet.
export function EditCustomerButton({
  customerId,
  defaultValues,
  fullWidth = false,
}: {
  customerId: string;
  defaultValues: CustomerValues;
  fullWidth?: boolean;
}) {
  const t = useT().customers;
  const tc = useT().common;
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={fullWidth ? undefined : "sm"}
        onClick={() => setOpen(true)}
        className={fullWidth ? "w-full" : undefined}
      >
        <Pencil className="h-4 w-4" />
        {tc.edit}
      </Button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t.customerDetails}
        closeLabel={tc.close}
      >
        <CustomerEditForm customerId={customerId} defaultValues={defaultValues} />
      </BottomSheet>
    </>
  );
}
