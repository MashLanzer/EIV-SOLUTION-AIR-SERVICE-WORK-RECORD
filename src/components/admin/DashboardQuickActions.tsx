"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, FolderPlus, UserPlus, Users2 } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { WorkerForm } from "@/components/workers/WorkerForm";
import { TeamForm } from "@/components/teams/TeamForm";
import { useT } from "@/components/i18n/LocaleProvider";

// Seed lists for the create forms (small id/name pairs).
export interface QuickCreateData {
  teams: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  users: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  positions: { id: string; name: string }[];
}

const tile =
  "flex flex-col items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-1 py-2.5 text-center text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800";
const iconCls = "h-5 w-5 text-neutral-500 dark:text-neutral-400";
const labelCls = "text-[11px] font-medium leading-tight";

// Dashboard quick actions. Schedule still navigates; Project / Worker / Team
// open their create form in a bottom sheet (same pattern as the FAB menu and
// the list pages), so creating happens in place. On success the action
// redirects to the new record, which closes the sheet.
export function DashboardQuickActions({ data }: { data: QuickCreateData }) {
  const t = useT();
  const d = t.dashboard;
  const [open, setOpen] = useState<null | "project" | "worker" | "team">(null);

  return (
    <div className="grid grid-cols-4 gap-2 animate-fade-up" style={{ animationDelay: "20ms" }}>
      <Link href="/admin/schedule" className={tile}>
        <CalendarPlus className={iconCls} />
        <span className={labelCls}>{d.qaSchedule}</span>
      </Link>
      <button type="button" onClick={() => setOpen("project")} className={tile}>
        <FolderPlus className={iconCls} />
        <span className={labelCls}>{d.qaProject}</span>
      </button>
      <button type="button" onClick={() => setOpen("worker")} className={tile}>
        <UserPlus className={iconCls} />
        <span className={labelCls}>{d.qaWorker}</span>
      </button>
      <button type="button" onClick={() => setOpen("team")} className={tile}>
        <Users2 className={iconCls} />
        <span className={labelCls}>{d.qaTeam}</span>
      </button>

      <BottomSheet
        open={open === "project"}
        onClose={() => setOpen(null)}
        title={t.projects.newProjectTitle}
        closeLabel={t.common.close}
      >
        <ProjectForm teams={data.teams} customers={data.customers} fullWidth />
      </BottomSheet>
      <BottomSheet
        open={open === "worker"}
        onClose={() => setOpen(null)}
        title={t.workers.newWorkerTitle}
        closeLabel={t.common.close}
      >
        <WorkerForm teams={data.teams} positions={data.positions} fullWidth />
      </BottomSheet>
      <BottomSheet
        open={open === "team"}
        onClose={() => setOpen(null)}
        title={t.teams.newTeamTitle}
        closeLabel={t.common.close}
      >
        <TeamForm users={data.users} projects={data.projects} />
      </BottomSheet>
    </div>
  );
}
