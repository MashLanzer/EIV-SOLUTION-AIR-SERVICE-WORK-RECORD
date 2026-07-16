"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { TeamForm } from "@/components/teams/TeamForm";
import { useT } from "@/components/i18n/LocaleProvider";

// "New team" as a bottom sheet instead of a separate page. On success the
// create action redirects to the new team's detail page (closing the sheet).
export function NewTeamButton({
  users,
  projects,
  variant = "default",
  className,
}: {
  users: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  variant?: "default" | "outline";
  className?: string;
}) {
  const t = useT().teams;
  const tc = useT().common;
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t.newTeam}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t.newTeamTitle} closeLabel={tc.close}>
        <TeamForm users={users} projects={projects} />
      </BottomSheet>
    </>
  );
}
