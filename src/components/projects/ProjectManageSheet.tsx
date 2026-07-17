"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Pencil, Settings2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteProjectButton } from "@/components/projects/DeleteProjectButton";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { useT } from "@/components/i18n/LocaleProvider";
import { useBackDismiss } from "@/hooks/useBackDismiss";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";

interface ProjectValues {
  name: string;
  address: string;
  status: string;
  teamId?: string;
  customerId?: string;
}

// "Manage project" as an overlay instead of an inline disclosure: the edit
// form, full-edit link and delete open in a bottom sheet (centered dialog on
// desktop), so opening it never pushes the project's content down the page.
export function ProjectManageSheet({
  projectId,
  teams,
  customers,
  defaultValues,
  editHref,
}: {
  projectId: string;
  teams: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  defaultValues: ProjectValues;
  editHref: string;
}) {
  const t = useT().projects;
  const tc = useT().common;
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  // System / browser back closes the sheet instead of navigating away.
  useBackDismiss(open, close);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // Keep the page behind the sheet from scrolling while it's open (ref-counted
    // so stacked overlays don't leave the page stuck at overflow:hidden).
    lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockBodyScroll();
    };
  }, [open]);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="h-4 w-4" />
        {t.manageProject}
      </Button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50"
            role="dialog"
            aria-modal="true"
            aria-label={t.manageProject}
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] animate-fade-up flex-col rounded-t-2xl border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[88vh] sm:max-w-lg sm:rounded-2xl sm:border native:pb-[env(safe-area-inset-bottom)]">
              <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  {t.manageProject}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={tc.close}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="flex flex-col gap-4">
                  <ProjectForm
                    projectId={projectId}
                    teams={teams}
                    customers={customers}
                    defaultValues={defaultValues}
                    fullWidth
                  />
                  <div className="flex flex-col gap-2 border-t border-neutral-200 dark:border-neutral-800 pt-4">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={editHref}>
                        <Pencil className="h-4 w-4" />
                        {t.fullEditPage}
                      </Link>
                    </Button>
                    <DeleteProjectButton projectId={projectId} fullWidth />
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
