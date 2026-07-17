"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select } from "@/components/ui/select";

// A generic URL-param filter for the schedule (team, required skill, …). Writes
// ?<param>=<value> while preserving every other param, so it composes with the
// worker filter and status chips. Clearing removes the param. Mirrors
// ScheduleWorkerFilter but for any single-select field.
export function ScheduleSelectFilter({
  param,
  options,
  allLabel,
  ariaLabel,
  className,
}: {
  param: string;
  options: { value: string; label: string }[];
  allLabel: string;
  ariaLabel: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(param) ?? "";

  function onChange(value: string) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(param, value);
    else p.delete(param);
    // Changing a filter shouldn't leave a day sheet open over the new results.
    p.delete("day");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <Select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className={className}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
