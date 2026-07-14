import { ShieldAlert } from "lucide-react";

import { exitOrgAction } from "@/actions/impersonation";

// Always-visible strip shown while a platform owner is in support mode, so it
// can never be mistaken for a normal admin session. The Exit button clears the
// impersonation cookie and returns to the console.
export function ImpersonationBanner({ orgName }: { orgName: string }) {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <span className="flex min-w-0 items-center gap-2">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span className="truncate">
          Support mode — acting as <strong>{orgName}</strong>
        </span>
      </span>
      <form action={exitOrgAction}>
        <button
          type="submit"
          className="shrink-0 rounded-md bg-amber-950/10 px-3 py-1 font-semibold transition-colors hover:bg-amber-950/20"
        >
          Exit
        </button>
      </form>
    </div>
  );
}
