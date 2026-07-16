"use client";

import { useRef } from "react";
import { Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PHOTO_OVERLAY_ICON } from "@/components/photos/PhotoViewer";
import { useT } from "@/components/i18n/LocaleProvider";
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
  const t = useT().photoDetail;
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={deletePhotoAndReturnAction.bind(null, photoId, basePath)}>
      <ConfirmDialog
        title={t.deletePhotoTitle}
        description={t.deletePhotoDesc}
        confirmLabel={t.delete}
        trigger={
          <button type="button" aria-label={t.deletePhotoAria} className={PHOTO_OVERLAY_ICON}>
            <Trash2 className="h-5 w-5" />
          </button>
        }
        onConfirm={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}
