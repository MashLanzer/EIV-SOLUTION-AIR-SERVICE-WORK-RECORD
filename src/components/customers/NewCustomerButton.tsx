"use client";

import { useActionState, useState } from "react";
import { Plus, UserPlus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCustomerAction, type CustomerFormState } from "@/actions/customers";
import { useT } from "@/components/i18n/LocaleProvider";

// Create a customer straight from the list in a bottom sheet, so the office
// can pre-register someone without waiting for their first job to spawn them.
// On success the action redirects to the new customer's page.
export function NewCustomerButton() {
  const t = useT().customers;
  const tc = useT().common;
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<CustomerFormState, FormData>(
    createCustomerAction,
    undefined
  );
  const err = (name: string) => state?.fieldErrors?.[name]?.[0];

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t.newCustomer}
      </Button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t.newCustomer}
        closeLabel={tc.close}
      >
        <form action={formAction} className="flex flex-col gap-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.newCustomerDesc}</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-name">{t.name}</Label>
            <Input id="new-name" name="name" required autoFocus aria-invalid={err("name") ? true : undefined} />
            <FieldError id="new-name-error" message={err("name")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-address">{t.address}</Label>
            <Input id="new-address" name="address" required aria-invalid={err("address") ? true : undefined} />
            <FieldError id="new-address-error" message={err("address")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-phone">{t.phone}</Label>
              <Input id="new-phone" name="phone" type="tel" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-email">{t.email}</Label>
              <Input id="new-email" name="email" type="email" aria-invalid={err("email") ? true : undefined} />
              <FieldError id="new-email-error" message={err("email")} />
            </div>
          </div>
          {state?.error && <Alert variant="error">{state.error}</Alert>}
          <Button type="submit" disabled={pending} className="w-full">
            <UserPlus className="h-4 w-4" />
            {pending ? t.creating : t.createCustomer}
          </Button>
        </form>
      </BottomSheet>
    </>
  );
}
