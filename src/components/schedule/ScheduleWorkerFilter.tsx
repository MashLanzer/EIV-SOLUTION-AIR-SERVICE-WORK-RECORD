"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select } from "@/components/ui/select";
import { useT } from "@/components/i18n/LocaleProvider";
import type { JobOption } from "@/components/schedule/ScheduleJobForm";

// Filter the whole calendar down to one worker's jobs. Writes ?worker=<id>
// into the URL (preserving view/date), so the server re-renders the counts and
// day lists for just that person. Clearing goes back to everyone.
export function ScheduleWorkerFilter({ workers }: { workers: JobOption[] }) {
  const t = useT().schedule;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("worker") ?? "";

  function onChange(id: string) {
    const p = new URLSearchParams(params.toString());
    if (id) p.set("worker", id);
    else p.delete("worker");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <Select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      aria-label={t.worker}
      className="sm:max-w-56"
    >
      <option value="">{t.allWorkers}</option>
      {workers.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name}
        </option>
      ))}
    </Select>
  );
}
