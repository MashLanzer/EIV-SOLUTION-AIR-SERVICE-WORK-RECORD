"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/LocaleProvider";
import { deleteTeamAction } from "@/actions/teams";

export function DeleteTeamButton({ teamId }: { teamId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const t = useT().teams;
  const tc = useT().common;
  return (
    <form ref={formRef} action={deleteTeamAction.bind(null, teamId)}>
      <ConfirmDialog
        title={t.deleteTitle}
        description={t.deleteDesc}
        confirmLabel={t.deleteConfirm}
        trigger={
          <Button type="button" variant="destructive" className="w-full">
            <Trash2 className="h-4 w-4" />
            {tc.delete}
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
