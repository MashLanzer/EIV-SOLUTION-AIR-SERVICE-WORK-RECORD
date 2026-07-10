"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteProjectAction } from "@/actions/projects";

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deleteProjectAction.bind(null, projectId)}>
      <ConfirmDialog
        title="Delete this project?"
        description="The project is removed. Its work records are kept but will no longer be linked to a project."
        confirmLabel="Delete project"
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
