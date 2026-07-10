"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteTeamAction } from "@/actions/teams";

export function DeleteTeamButton({ teamId }: { teamId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={deleteTeamAction.bind(null, teamId)}>
      <ConfirmDialog
        title="Delete this team?"
        description="The team is removed and its members are unassigned. Projects assigned to it keep their work but lose the team link."
        confirmLabel="Delete team"
        trigger={
          <Button type="button" variant="destructive" size="sm">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
