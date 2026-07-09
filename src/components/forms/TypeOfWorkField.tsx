"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TYPE_OF_WORK_OPTIONS } from "@/lib/validations";

export function TypeOfWorkField({
  defaultValue,
  invalid,
}: {
  defaultValue?: string;
  invalid?: boolean;
}) {
  const isPreset = defaultValue
    ? (TYPE_OF_WORK_OPTIONS as readonly string[]).includes(defaultValue)
    : false;
  const isCustom = Boolean(defaultValue) && !isPreset;
  const [selected, setSelected] = useState<string>(
    isCustom ? "Other" : defaultValue || TYPE_OF_WORK_OPTIONS[0]
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
        {TYPE_OF_WORK_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
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
