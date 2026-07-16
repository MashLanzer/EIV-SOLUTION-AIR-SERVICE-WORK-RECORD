"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";

import { BottomSheet } from "@/components/layout/BottomSheet";
import { BottomSheet as FormSheet } from "@/components/ui/bottom-sheet";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { TeamForm } from "@/components/teams/TeamForm";
import { WorkerForm } from "@/components/workers/WorkerForm";
import { useT } from "@/components/i18n/LocaleProvider";

export interface CreateItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface MoreItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

// Seed data for the "create" sheets (small id/name lists). Null for roles that
// can't create (supervisors), which also get an empty createItems list.
export interface CreateData {
  teams: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  users: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}

// Which known create route each item maps to, so the item opens that form in a
// sheet instead of navigating to the /new page.
function createKind(href: string): "project" | "team" | "worker" | null {
  if (href === "/admin/projects/new") return "project";
  if (href === "/admin/teams/new") return "team";
  if (href === "/admin/workers/new") return "worker";
  return null;
}

// The single sheet opened by the center button in AppTabBar:
//   Create  — the role's "new X" actions (primary, so it leads).
//   More    — secondary navigation (admin only; workers have none).
// The create actions open their form in a bottom sheet in place (rather than
// navigating to a /new page); on success the action redirects to the new
// record, closing the sheet.
export function AppMenuSheet({
  open,
  onClose,
  createItems,
  moreItems,
  createData,
}: {
  open: boolean;
  onClose: () => void;
  createItems: CreateItem[];
  moreItems: MoreItem[];
  createData?: CreateData | null;
}) {
  const t = useT();
  const n = t.nav;
  const [create, setCreate] = useState<"project" | "team" | "worker" | null>(null);

  const rowClass =
    "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-neutral-900 dark:text-neutral-100 active:bg-neutral-100 dark:active:bg-neutral-800";

  return (
    <>
      <BottomSheet open={open} onClose={onClose} label={n.menu}>
        {/* Create */}
        <p className="px-4 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {n.create}
        </p>
        <ul className="flex flex-col px-2 pb-2">
          {createItems.map((item) => {
            const Icon = item.icon;
            const kind = createData ? createKind(item.href) : null;
            const inner = (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                {item.label}
              </>
            );
            return (
              <li key={item.href}>
                {kind ? (
                  <button
                    type="button"
                    className={rowClass}
                    onClick={() => {
                      onClose();
                      setCreate(kind);
                    }}
                  >
                    {inner}
                  </button>
                ) : (
                  <Link href={item.href} onClick={onClose} className={rowClass}>
                    {inner}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        {moreItems.length > 0 && (
          <>
            <div className="mx-4 border-t border-neutral-100 dark:border-neutral-800" />
            <p className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {n.more}
            </p>
            <ul className="flex flex-col px-2 pb-2">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-100 active:bg-neutral-100 dark:active:bg-neutral-800"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {item.badge ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-white tabular-nums">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      ) : null}
                      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* Clearance so the floating tab bar (which rides above the sheet while
            open, to keep the × close button visible) doesn't cover this row. */}
        <div aria-hidden="true" className="h-20" />
      </BottomSheet>

      {/* Create forms, opened in place from the menu above. */}
      {createData && (
        <>
          <FormSheet
            open={create === "project"}
            onClose={() => setCreate(null)}
            title={t.projects.newProjectTitle}
            closeLabel={t.common.close}
          >
            <ProjectForm teams={createData.teams} customers={createData.customers} fullWidth />
          </FormSheet>
          <FormSheet
            open={create === "worker"}
            onClose={() => setCreate(null)}
            title={t.workers.newWorkerTitle}
            closeLabel={t.common.close}
          >
            <WorkerForm teams={createData.teams} fullWidth />
          </FormSheet>
          <FormSheet
            open={create === "team"}
            onClose={() => setCreate(null)}
            title={t.teams.newTeamTitle}
            closeLabel={t.common.close}
          >
            <TeamForm users={createData.users} projects={createData.projects} />
          </FormSheet>
        </>
      )}
    </>
  );
}
