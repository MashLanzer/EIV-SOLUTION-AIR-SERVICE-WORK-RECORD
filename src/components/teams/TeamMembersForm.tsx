"use client";

import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MemberChecklist, type MemberOption } from "@/components/teams/MemberChecklist";
import { useT } from "@/components/i18n/LocaleProvider";
import { setTeamMembersAction } from "@/actions/teams";

export function TeamMembersForm({
  teamId,
  users,
  memberIds,
}: {
  teamId: string;
  users: MemberOption[];
  memberIds: string[];
}) {
  const t = useT().teams;

  return (
    <form
      action={setTeamMembersAction.bind(null, teamId)}
      className="flex flex-col gap-4"
    >
      <MemberChecklist users={users} name="userId" selectedIds={memberIds} />
      <Button type="submit" className="w-full">
        <Save className="h-4 w-4" />
        {t.saveMembers}
      </Button>
    </form>
  );
}
