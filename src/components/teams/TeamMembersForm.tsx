"use client";

import { Check, Save } from "lucide-react";

import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/LocaleProvider";
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
  const t = useT().teams;

  return (
    <form
      action={setTeamMembersAction.bind(null, teamId)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <label
            key={u.id}
            className="group flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 px-3 py-2.5 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 has-[:checked]:border-primary has-[:checked]:bg-accent-soft"
          >
            <input
              type="checkbox"
              name="userId"
              value={u.id}
              defaultChecked={memberSet.has(u.id)}
              className="peer sr-only"
            />
            <AvatarInitials name={u.name || u.email} className="h-9 w-9 text-xs" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                  {u.name}
                </span>
                <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                  {u.role === "ADMIN" ? t.roleAdmin : t.roleWorker}
                </Badge>
              </div>
              <div className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                {u.email}
              </div>
            </div>
            {/* Custom monochrome check - the native box is sr-only but still
                submits and takes focus (ring mirrored here). */}
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-600 text-primary-foreground transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background group-has-[:checked]:border-primary group-has-[:checked]:bg-primary">
              <Check className="h-3.5 w-3.5 opacity-0 transition-opacity group-has-[:checked]:opacity-100" />
            </span>
          </label>
        ))}
      </div>
      <Button type="submit" className="w-fit">
        <Save className="h-4 w-4" />
        {t.saveMembers}
      </Button>
    </form>
  );
}
