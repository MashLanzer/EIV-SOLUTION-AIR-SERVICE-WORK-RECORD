"use client";

import { useRef } from "react";
import { Merge } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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
        Merge into…
      </Button>
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className="m-auto w-[calc(100vw-2rem)] max-w-md animate-fade-up rounded-lg border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-black/40"
      >
        <form action={mergeCustomerAction.bind(null, sourceId)}>
          <h2 className="text-base font-semibold text-slate-900">
            Merge customer
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Move every job from this customer to the one you pick, then delete
            this duplicate. This can&apos;t be undone.
          </p>
          <Select name="targetId" required className="mt-3" defaultValue="">
            <option value="" disabled>
              Choose the customer to keep…
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
              Cancel
            </Button>
            <Button type="submit" variant="destructive">
              <Merge className="h-4 w-4" />
              Merge
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
