"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ScheduleJobForm, type JobOption } from "@/components/schedule/ScheduleJobForm";
import { useT } from "@/components/i18n/LocaleProvider";

// "New job" opens the schedule form in a bottom sheet instead of the old
// always-present collapsible panel at the top of the page. Open state is driven
// by the ?new=1 query param, so every existing entry point that already links
// with ?new=1 (the empty-day CTA, the week board's "+") opens the same sheet,
// pre-filled with that day's date.
export function NewScheduledJobButton({
  defaultDate,
  defaultDurationMinutes,
  workers,
  teams,
  customers,
  projects,
  workerSkills,
  skillSuggestions,
  loadByDay,
}: {
  defaultDate?: string;
  // Company default job length (Settings → Scheduling); auto-fills the end time
  // once a start time is picked in create mode.
  defaultDurationMinutes?: number;
  workers: JobOption[];
  teams: JobOption[];
  customers: JobOption[];
  projects: JobOption[];
  workerSkills?: Record<string, string[]>;
  skillSuggestions?: string[];
  loadByDay?: Record<string, Record<string, number>>;
}) {
  const t = useT().schedule;
  const tc = useT().common;
  const params = useSearchParams();
  const router = useRouter();
  const open = params.get("new") === "1";
  // Opened from the "needs scheduling" backlog: pre-point the form at a project.
  const newProject = params.get("newProject") ?? undefined;

  function setParam(next: boolean) {
    const p = new URLSearchParams(params.toString());
    if (next) p.set("new", "1");
    else {
      p.delete("new");
      p.delete("newProject");
    }
    const qs = p.toString();
    router.replace(qs ? `/admin/schedule?${qs}` : "/admin/schedule", { scroll: false });
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setParam(true)}>
        <CalendarPlus className="h-4 w-4" />
        <span className="hidden sm:inline">{t.newJob}</span>
      </Button>
      <BottomSheet open={open} onClose={() => setParam(false)} title={t.newJob} closeLabel={tc.close}>
        <ScheduleJobForm
          defaultDate={defaultDate}
          defaultDurationMinutes={defaultDurationMinutes}
          defaultProjectId={newProject}
          workers={workers}
          teams={teams}
          customers={customers}
          projects={projects}
          workerSkills={workerSkills}
          skillSuggestions={skillSuggestions}
          loadByDay={loadByDay}
          onDone={() => setParam(false)}
          fullWidth
        />
      </BottomSheet>
    </>
  );
}
