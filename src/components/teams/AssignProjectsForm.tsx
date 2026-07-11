"use client";

import { Save } from "lucide-react";
import type { ProjectStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
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

  if (projects.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Create a project first, then assign it to this team here.
      </p>
    );
  }

  return (
    <form
      action={setTeamProjectsAction.bind(null, teamId)}
      className="flex flex-col gap-4"
    >
      <div className="flex max-h-80 flex-col divide-y divide-neutral-200 dark:divide-neutral-800 overflow-y-auto">
        {projects.map((p) => (
          <label key={p.id} className="flex cursor-pointer items-center gap-3 py-3">
            <input
              type="checkbox"
              name="projectId"
              value={p.id}
              defaultChecked={assigned.has(p.id)}
              className="h-4 w-4 shrink-0"
            />
            <span className="min-w-0 flex-1 truncate font-medium text-neutral-900 dark:text-neutral-100">
              {p.name}
            </span>
            <ProjectStatusBadge status={p.status} />
          </label>
        ))}
      </div>
      <div>
        <Button type="submit">
          <Save className="h-4 w-4" />
          Save projects
        </Button>
      </div>
    </form>
  );
}
