"use client";

import { Check } from "lucide-react";

import { AvatarInitials } from "@/components/ui/avatar-initials";
import { useT } from "@/components/i18n/LocaleProvider";

export type MemberRole = "ADMIN" | "SUPERVISOR" | "WORKER";

export interface MemberOption {
  id: string;
  name: string;
  email?: string;
  role: MemberRole;
}

// The order groups render in — office roles first, crew last — so admins and
// workers read as clearly separate blocks rather than one flat list.
const ROLE_ORDER: MemberRole[] = ["ADMIN", "SUPERVISOR", "WORKER"];

// A people picker that groups selectable members by access level (Admins /
// Supervisors / Workers) under labelled headers, so it's obvious who's an
// admin and who's a worker while building a team. Shared by the create form
// and the edit-members form so both read the same. Each row is a checkbox
// posting `name` with the user id.
export function MemberChecklist({
  users,
  name,
  selectedIds = [],
}: {
  users: MemberOption[];
  // The form field each checked person posts under (e.g. "userId").
  name: string;
  // Ids checked by default (edit mode); empty for a fresh team.
  selectedIds?: string[];
}) {
  const t = useT().teams;
  const selected = new Set(selectedIds);
  const label: Record<MemberRole, string> = {
    ADMIN: t.membersAdmins,
    SUPERVISOR: t.membersSupervisors,
    WORKER: t.membersWorkers,
  };

  const groups = ROLE_ORDER.map((role) => ({
    role,
    people: users.filter((u) => u.role === role),
  })).filter((g) => g.people.length > 0);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.membersEmpty}</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.role} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 px-0.5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {label[group.role]}
            <span className="tabular-nums text-neutral-400 dark:text-neutral-500">
              {group.people.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {group.people.map((u) => (
              <label
                key={u.id}
                className="group flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2.5 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 has-[:checked]:border-primary has-[:checked]:bg-accent-soft"
              >
                <input
                  type="checkbox"
                  name={name}
                  value={u.id}
                  defaultChecked={selected.has(u.id)}
                  className="peer sr-only"
                />
                <AvatarInitials name={u.name || u.email || "?"} className="h-9 w-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">
                    {u.name}
                  </span>
                  {u.email && (
                    <span className="block truncate text-sm text-neutral-500 dark:text-neutral-400">
                      {u.email}
                    </span>
                  )}
                </div>
                {/* Custom monochrome check — the native box is sr-only but still
                    submits and takes focus (ring mirrored here). */}
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-600 text-primary-foreground transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background group-has-[:checked]:border-primary group-has-[:checked]:bg-primary">
                  <Check className="h-3.5 w-3.5 opacity-0 transition-opacity group-has-[:checked]:opacity-100" />
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
