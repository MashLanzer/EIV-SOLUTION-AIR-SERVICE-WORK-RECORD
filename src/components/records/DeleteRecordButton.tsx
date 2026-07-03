"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteRecordAction } from "@/actions/records";

export function DeleteRecordButton({ recordId }: { recordId: string }) {
  return (
    <form
      action={deleteRecordAction.bind(null, recordId)}
      onSubmit={(e) => {
        if (!confirm("Delete this record? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <Button type="submit" variant="destructive" size="icon" aria-label="Delete record">
        <Trash2 className="h-4 w-4" />
      </Button>
    </form>
  );
}
