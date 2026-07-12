"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TYPE_OF_WORK_OPTIONS } from "@/lib/validations";
import type { WorkTypeGroup } from "@/lib/workTypes";

// The "type of work" picker. When the company has configured work types
// (Settings → Work types) they're offered grouped by category; otherwise it
// falls back to a small built-in list. Either way "Other…" reveals a free
// text box, and the chosen value always posts as the plain `typeOfWork`
// string, so records/reports/PDF are unchanged.
export function TypeOfWorkField({
  defaultValue,
  invalid,
  groups,
}: {
  defaultValue?: string;
  invalid?: boolean;
  groups?: WorkTypeGroup[];
}) {
  const nonEmpty = (groups ?? []).filter((g) => g.items.length > 0);
  const useGroups = nonEmpty.length > 0;

  const presetNames = useGroups
    ? nonEmpty.flatMap((g) => g.items.map((i) => i.name))
    : (TYPE_OF_WORK_OPTIONS as readonly string[]).filter((o) => o !== "Other");

  const isPreset = defaultValue ? presetNames.includes(defaultValue) : false;
  const isCustom = Boolean(defaultValue) && !isPreset;
  const firstPreset = presetNames[0] ?? "Other";
  const [selected, setSelected] = useState<string>(
    isCustom ? "Other" : defaultValue || firstPreset
  );

  return (
    <div className="flex flex-col gap-2">
      <Select
        id="typeOfWork"
        aria-invalid={invalid && selected !== "Other" ? true : undefined}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        name={selected === "Other" ? undefined : "typeOfWork"}
      >
        {useGroups
          ? nonEmpty.map((group) => (
              <optgroup key={group.id} label={group.name}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ))
          : presetNames.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
        <option value="Other">Other…</option>
      </Select>
      {selected === "Other" && (
        <Input
          name="typeOfWork"
          placeholder="Describe the type of work"
          defaultValue={isCustom ? defaultValue : ""}
          aria-label="Describe the type of work"
          aria-invalid={invalid ? true : undefined}
          required
        />
      )}
    </div>
  );
}
