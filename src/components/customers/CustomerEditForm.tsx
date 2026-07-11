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

  const err = (name: string) => state?.fieldErrors?.[name]?.[0];

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Name</Label>
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
          <Label htmlFor="address">Address</Label>
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
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={defaultValues.phone}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
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
        <span>
          Also update the name/address on this customer&apos;s existing work
          records. Leave unchecked to keep their past records exactly as they
          were submitted.
        </span>
      </label>

      {state?.error && <Alert variant="error">{state.error}</Alert>}

      <div>
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "Saving..." : "Save customer"}
        </Button>
      </div>
    </form>
  );
}
