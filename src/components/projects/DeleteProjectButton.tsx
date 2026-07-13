"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useT } from "@/components/i18n/LocaleProvider";
import { deleteProjectAction } from "@/actions/projects";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const t = useT().projects;
  const tc = useT().common;

  return (
    <form ref={formRef} action={deleteProjectAction.bind(null, projectId)}>
      <ConfirmDialog
        title={t.deleteProjectTitle}
        description={t.deleteProjectDesc}
        confirmLabel={t.deleteProjectConfirm}
        trigger={
          <Button type="button" variant="destructive" size="sm">
            <Trash2 className="h-4 w-4" />
            {tc.delete}
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
