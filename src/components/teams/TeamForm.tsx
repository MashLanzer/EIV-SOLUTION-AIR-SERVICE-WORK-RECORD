"use client";

import { useActionState, useState } from "react";
import { Check, Save } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberChecklist, type MemberOption } from "@/components/teams/MemberChecklist";
import {
  createTeamAction,
  updateTeamAction,
  type TeamFormState,
} from "@/actions/teams";
import { TEAM_COLORS } from "@/lib/teamColors";
import { useBeforeUnloadGuard } from "@/hooks/useBeforeUnloadGuard";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export function TeamForm({
  teamId,
  defaultName,
  defaultColor,
  users = [],
  projects = [],
}: {
  teamId?: string;
  defaultName?: string;
  defaultColor?: string | null;
  // Only used when creating - seed members/projects up front. On the edit page
  // these are managed by dedicated forms instead.
  users?: MemberOption[];
  projects?: { id: string; name: string }[];
}) {
  const action = teamId ? updateTeamAction.bind(null, teamId) : createTeamAction;
  const [state, formAction, pending] = useActionState<TeamFormState, FormData>(
    action,
    undefined
  );
  const [color, setColor] = useState<string>(defaultColor ?? "");
  const [dirty, setDirty] = useState(false);
  useBeforeUnloadGuard(dirty && !pending);
  const t = useT().teams;
  const tc = useT().common;

  return (
    <form
      action={formAction}
      onChange={() => setDirty(true)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="name" required>
          {t.teamName}
        </Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultName}
          placeholder={t.teamNamePlaceholder}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t.color}</Label>
        <input type="hidden" name="color" value={color} />
        <div className="flex flex-wrap gap-2">
          {TEAM_COLORS.map((c) => {
            const selected = c.key === color;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  setColor(selected ? "" : c.key);
                  setDirty(true);
                }}
                aria-label={c.label}
                aria-pressed={selected}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-105",
                  c.dot,
                  selected && "ring-2 ring-offset-2 ring-neutral-900 dark:ring-neutral-100 ring-offset-white dark:ring-offset-neutral-900"
                )}
              >
                {selected && <Check className="h-4 w-4 text-white" />}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {t.colorHint}
        </p>
      </div>

      {/* On create only: seed members and projects right away. Members are
          grouped by access level (Admins / Supervisors / Workers) so it's clear
          who's who while building the team. */}
      {!teamId && users.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>
            {t.members}{" "}
            <span className="font-normal text-neutral-400 dark:text-neutral-500">
              ({tc.optional})
            </span>
          </Label>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
            <MemberChecklist users={users} name="userId" />
          </div>
        </div>
      )}

      {!teamId && projects.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>
            {t.projectsLabel}{" "}
            <span className="font-normal text-neutral-400 dark:text-neutral-500">
              ({tc.optional})
            </span>
          </Label>
          <div className="flex max-h-56 flex-col divide-y divide-neutral-200 dark:divide-neutral-800 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            {projects.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm"
              >
                <Checkbox name="projectId" value={p.id} />
                <span className="text-neutral-800 dark:text-neutral-200">{p.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {state?.error && <Alert variant="error">{state.error}</Alert>}
      <Button type="submit" disabled={pending} className="w-full">
        <Save className="h-4 w-4" />
        {pending ? t.saving : teamId ? t.saveTeam : t.createTeam}
      </Button>
    </form>
  );
}
