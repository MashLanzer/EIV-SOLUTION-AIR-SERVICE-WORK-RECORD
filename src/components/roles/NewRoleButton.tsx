"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PositionForm } from "@/components/roles/PositionForm";
import { useT } from "@/components/i18n/LocaleProvider";

// "New role" opens the position form in a bottom sheet; on save the action
// redirects back to the roles page (closing the sheet).
export function NewRoleButton() {
  const t = useT().roles;
  const tc = useT().common;
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t.newRole}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t.newRole} closeLabel={tc.close}>
        <PositionForm />
      </BottomSheet>
    </>
  );
}
