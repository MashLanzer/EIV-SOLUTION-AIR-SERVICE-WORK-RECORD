"use client";

import { useId, useRef } from "react";
import { Merge } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useT } from "@/components/i18n/LocaleProvider";
import { mergeCustomerAction } from "@/actions/customers";

interface OtherCustomer {
  id: string;
  name: string;
  address: string;
}

// Move all of this customer's jobs into another customer, then delete this
// one. Uses a native <dialog> so the target can be chosen and confirmed in
// one step (the destructive delete is spelled out in the copy).
export function MergeCustomerForm({
  sourceId,
  others,
}: {
  sourceId: string;
  others: OtherCustomer[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const t = useT().customers;
  const tc = useT().common;

  if (others.length === 0) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Merge className="h-4 w-4" />
        {t.mergeInto}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[calc(100vw-2rem)] max-w-md animate-fade-up rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xl backdrop:bg-black/40"
      >
        <form action={mergeCustomerAction.bind(null, sourceId)}>
          <h2 id={titleId} className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {t.mergeTitle}
          </h2>
          <p id={descriptionId} className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {t.mergeDesc}
          </p>
          <Select name="targetId" required className="mt-3" defaultValue="">
            <option value="" disabled>
              {t.mergeChoose}
            </option>
            {others.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.address}
              </option>
            ))}
          </Select>
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => dialogRef.current?.close()}
            >
              {tc.cancel}
            </Button>
            <Button type="submit" variant="destructive">
              <Merge className="h-4 w-4" />
              {t.merge}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
