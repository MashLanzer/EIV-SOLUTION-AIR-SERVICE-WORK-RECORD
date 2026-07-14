"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";

import { respondToEstimateAction } from "@/actions/estimates";
import { useT } from "@/components/i18n/LocaleProvider";

// Light-only (public estimate page). Accept/decline buttons that post to the
// token-gated action, then show a thank-you inline.
export function EstimateRespondForm({ token }: { token: string }) {
  const t = useT().estimates;
  const [done, setDone] = useState<null | "accepted" | "declined">(null);
  const [pending, startTransition] = useTransition();

  if (done === "accepted") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-800">
        {t.acceptedThanks}
      </div>
    );
  }
  if (done === "declined") {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center text-sm text-neutral-600">
        {t.declinedNote}
      </div>
    );
  }

  function respond(accept: boolean) {
    startTransition(async () => {
      await respondToEstimateAction(token, accept);
      setDone(accept ? "accepted" : "declined");
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        disabled={pending}
        onClick={() => respond(true)}
        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
        {t.acceptButton}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => respond(false)}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
      >
        <X className="h-4 w-4" />
        {t.declineButton}
      </button>
    </div>
  );
}
