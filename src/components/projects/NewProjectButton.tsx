"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { useT } from "@/components/i18n/LocaleProvider";

// "New project" as a bottom sheet instead of a separate page: the create form
// opens in place and, on success, the action redirects to the new project's
// detail page (which closes the sheet). The /admin/projects/new page is kept
// for the FAB menu and direct links.
export function NewProjectButton({
  teams,
  customers,
  variant = "default",
  className,
}: {
  teams: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  variant?: "default" | "outline";
  className?: string;
}) {
  const t = useT().projects;
  const tc = useT().common;
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t.newProject}
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t.newProjectTitle} closeLabel={tc.close}>
        <ProjectForm teams={teams} customers={customers} fullWidth />
      </BottomSheet>
    </>
  );
}
