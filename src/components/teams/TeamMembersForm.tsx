"use client";

import { Save } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setTeamMembersAction } from "@/actions/teams";

interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "WORKER";
}

export function TeamMembersForm({
  teamId,
  users,
  memberIds,
}: {
  teamId: string;
  users: OrgUser[];
  memberIds: string[];
}) {
  const memberSet = new Set(memberIds);

  return (
    <form
      action={setTeamMembersAction.bind(null, teamId)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
        {users.map((u) => (
          <label
            key={u.id}
            className="flex cursor-pointer items-center gap-3 py-3"
          >
            <input
              type="checkbox"
              name="userId"
              value={u.id}
              defaultChecked={memberSet.has(u.id)}
              className="h-4 w-4 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                  {u.name}
                </span>
                <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                  {u.role === "ADMIN" ? "Admin" : "Worker"}
                </Badge>
              </div>
              <div className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                {u.email}
              </div>
            </div>
          </label>
        ))}
      </div>
      <div>
        <Button type="submit">
          <Save className="h-4 w-4" />
          Save members
        </Button>
      </div>
    </form>
  );
}
