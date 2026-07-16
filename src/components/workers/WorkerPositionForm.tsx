"use client";

import { useState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { setWorkerPositionAction } from "@/actions/positions";
import { useT } from "@/components/i18n/LocaleProvider";

// Assign a company position to a worker (or clear it to fall back to the
// role defaults). A Save button appears only when the selection changed.
export function WorkerPositionForm({
  userId,
  currentPositionId,
  positions,
}: {
  userId: string;
  currentPositionId: string | null;
  positions: { id: string; name: string }[];
}) {
  const t = useT().workers;
  const tc = useT().common;
  const [value, setValue] = useState(currentPositionId ?? "");
  const changed = value !== (currentPositionId ?? "");

  return (
    <form
      action={setWorkerPositionAction.bind(null, userId)}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <Select
        name="positionId"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={t.position}
        className="sm:max-w-xs"
      >
        <option value="">{t.noPosition}</option>
        {positions.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
      {changed && (
        <Button type="submit" size="sm">
          <Save className="h-4 w-4" />
          {tc.save}
        </Button>
      )}
    </form>
  );
}
