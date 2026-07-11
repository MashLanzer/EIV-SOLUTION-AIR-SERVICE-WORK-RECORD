"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deletePhotoAndReturnAction } from "@/actions/photos";

// Delete a photo from its detail page, then return to the project. The server
// action re-checks that a worker only deletes their own photo.
export function PhotoDeleteButton({
  photoId,
  basePath,
}: {
  photoId: string;
  basePath: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deletePhotoAndReturnAction.bind(null, photoId, basePath)}>
      <ConfirmDialog
        title="Delete this photo?"
        description="This permanently removes the photo, its tags and comments. This cannot be undone."
        confirmLabel="Delete"
        trigger={
          <Button type="button" variant="outline" size="sm" aria-label="Delete photo">
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
