"use client";

import { useActionState, useTransition } from "react";
import { Megaphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  clearAnnouncementAction,
  setAnnouncementAction,
  type SuperFormState,
} from "@/actions/superAdmin";

export function AnnouncementControls({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState<SuperFormState, FormData>(
    setAnnouncementAction,
    undefined
  );
  const [clearing, startClear] = useTransition();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        <Megaphone className="h-4 w-4" />
        Announcement
      </h2>
      <p className="text-xs text-neutral-400">
        Shows a banner to every company&apos;s admins. Leave blank and save nothing to keep the current one.
      </p>
      <form action={action} className="flex flex-col gap-2">
        <Textarea
          name="message"
          rows={2}
          maxLength={400}
          defaultValue={current ?? ""}
          placeholder="e.g. Scheduled maintenance Sunday 2–4am ET."
        />
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {current ? "Update banner" : "Publish banner"}
          </Button>
          {current && (
            <Button
              type="button"
              variant="ghost"
              disabled={clearing}
              onClick={() => startClear(() => clearAnnouncementAction())}
            >
              Clear
            </Button>
          )}
        </div>
      </form>
      {state?.error && <p className="text-xs text-destructive-text">{state.error}</p>}
    </div>
  );
}
