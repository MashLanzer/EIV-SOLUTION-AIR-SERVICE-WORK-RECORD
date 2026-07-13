"use client";

import { Check, FolderKanban, Save } from "lucide-react";
import type { ProjectStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { useT } from "@/components/i18n/LocaleProvider";
import { setTeamProjectsAction } from "@/actions/teams";

interface OrgProject {
  id: string;
  name: string;
  status: ProjectStatus;
}

// Check the projects this team should own. Submitting replaces the team's whole
// project set (unchecked ones are unassigned), mirroring TeamMembersForm.
export function AssignProjectsForm({
  teamId,
  projects,
  assignedIds,
}: {
  teamId: string;
  projects: OrgProject[];
  assignedIds: string[];
}) {
  const assigned = new Set(assignedIds);
  const t = useT().teams;

  if (projects.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {t.createProjectFirst}
      </p>
    );
  }

  return (
    <form
      action={setTeamProjectsAction.bind(null, teamId)}
      className="flex flex-col gap-4"
    >
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {projects.map((p) => (
          <label
            key={p.id}
            className="group flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2.5 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 has-[:checked]:border-primary has-[:checked]:bg-accent-soft"
          >
            <input
              type="checkbox"
              name="projectId"
              value={p.id}
              defaultChecked={assigned.has(p.id)}
              className="peer sr-only"
            />
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
              <FolderKanban className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-neutral-900 dark:text-neutral-100">
              {p.name}
            </span>
            <ProjectStatusBadge status={p.status} />
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-600 text-primary-foreground transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background group-has-[:checked]:border-primary group-has-[:checked]:bg-primary">
              <Check className="h-3.5 w-3.5 opacity-0 transition-opacity group-has-[:checked]:opacity-100" />
            </span>
          </label>
        ))}
      </div>
      <Button type="submit" className="w-fit">
        <Save className="h-4 w-4" />
        {t.saveProjects}
      </Button>
    </form>
  );
}
