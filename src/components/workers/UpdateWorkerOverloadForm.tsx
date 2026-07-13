"use client";

import { useActionState, useState } from "react";
import { Gauge } from "lucide-react";

import {
  updateWorkerOverloadAction,
  type UpdateWorkerOverloadState,
} from "@/actions/workers";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/components/i18n/LocaleProvider";

// Per-worker overload threshold: a blank field means "use the company default"
// (shown as the placeholder). The Save button only appears once the value
// actually changes, matching the other inline worker controls.
export function UpdateWorkerOverloadForm({
  userId,
  current,
  orgDefault,
}: {
  userId: string;
  current: number | null;
  orgDefault: number;
}) {
  const [state, formAction, pending] = useActionState<
    UpdateWorkerOverloadState,
    FormData
  >(updateWorkerOverloadAction.bind(null, userId), undefined);
  const t = useT().workers;
  const initial = current == null ? "" : String(current);
  const [value, setValue] = useState(initial);
  const changed = value.trim() !== initial;

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          name="threshold"
          type="number"
          inputMode="numeric"
          min={1}
          max={50}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={String(orgDefault)}
          aria-label={t.overloadThreshold}
          className="max-w-[8rem]"
        />
        {changed && (
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            <Gauge className="h-4 w-4" />
            {pending ? t.saving : t.save}
          </Button>
        )}
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {t.overloadThresholdHint.replace("{default}", String(orgDefault))}
      </p>
      {state?.error && <Alert variant="error">{state.error}</Alert>}
    </form>
  );
}
