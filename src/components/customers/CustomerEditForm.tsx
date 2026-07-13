"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateCustomerAction,
  type CustomerFormState,
} from "@/actions/customers";
import { useBeforeUnloadGuard } from "@/hooks/useBeforeUnloadGuard";
import { useT } from "@/components/i18n/LocaleProvider";

interface CustomerValues {
  name: string;
  address: string;
  phone: string;
  email: string;
}

export function CustomerEditForm({
  customerId,
  defaultValues,
}: {
  customerId: string;
  defaultValues: CustomerValues;
}) {
  const [state, formAction, pending] = useActionState<
    CustomerFormState,
    FormData
  >(updateCustomerAction.bind(null, customerId), undefined);
  const [dirty, setDirty] = useState(false);
  useBeforeUnloadGuard(dirty && !pending);
  const t = useT().customers;

  const err = (name: string) => state?.fieldErrors?.[name]?.[0];

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">{t.name}</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={defaultValues.name}
            aria-invalid={err("name") ? true : undefined}
          />
          <FieldError id="name-error" message={err("name")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="address">{t.address}</Label>
          <Input
            id="address"
            name="address"
            required
            defaultValue={defaultValues.address}
            aria-invalid={err("address") ? true : undefined}
          />
          <FieldError id="address-error" message={err("address")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">{t.phone}</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={defaultValues.phone}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t.email}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues.email}
            aria-invalid={err("email") ? true : undefined}
          />
          <FieldError id="email-error" message={err("email")} />
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
        <input
          type="checkbox"
          name="applyToExistingRecords"
          className="mt-0.5"
        />
        <span>{t.applyToRecords}</span>
      </label>

      {state?.error && <Alert variant="error">{state.error}</Alert>}

      <div>
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? t.saving : t.saveCustomer}
        </Button>
      </div>
    </form>
  );
}
