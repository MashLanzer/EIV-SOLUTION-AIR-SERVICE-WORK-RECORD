"use client";

import { useState, useTransition } from "react";
import { Check, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";

type Result = { ok: true } | { error: string };

// Generic "email this to the customer" button. The bound server action + all
// labels are passed in, so it stays i18n-agnostic and reusable for invoices,
// estimates, etc. Error codes from the action map to messages via `errors`.
export function EmailToCustomerButton({
  action,
  label,
  sendingLabel,
  sentLabel,
  errors,
}: {
  action: () => Promise<Result>;
  label: string;
  sendingLabel: string;
  sentLabel: string;
  errors: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if ("ok" in res && res.ok) {
        setSent(true);
        setTimeout(() => setSent(false), 3000);
      } else if ("error" in res) {
        setError(errors[res.error] ?? errors.default ?? "Error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" onClick={run} disabled={pending || sent}>
        {sent ? <Check className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
        {sent ? sentLabel : pending ? sendingLabel : label}
      </Button>
      {error && <p className="text-xs text-destructive-text">{error}</p>}
    </div>
  );
}
