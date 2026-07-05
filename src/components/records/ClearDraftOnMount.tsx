"use client";

import { useEffect } from "react";

import { clearDraft } from "@/lib/draftStore";

// Landing on /records?saved=1 is the only reliable proof a new record was
// actually created (the create action redirects here on success, and only
// on success - a network/server failure never reaches this page). That's
// the right moment to drop the autosaved draft, rather than clearing it
// optimistically before the submit is known to have worked.
export function ClearDraftOnMount({ draftKey }: { draftKey: string }) {
  useEffect(() => {
    clearDraft(draftKey);
  }, [draftKey]);

  return null;
}
