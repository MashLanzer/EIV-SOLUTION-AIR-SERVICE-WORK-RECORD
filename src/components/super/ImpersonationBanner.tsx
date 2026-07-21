import { Eye, ShieldAlert, UserRound } from "lucide-react";

import { exitOrgAction } from "@/actions/impersonation";

// Always-visible strip shown while a platform owner is in support mode, so it
// can never be mistaken for a normal admin session. The Exit button clears the
// impersonation cookie and returns to the console. When asUser is set the owner
// is "viewing as" a specific person (their exact role/permissions), so the strip
// names that person instead of just the company.
export function ImpersonationBanner({
  orgName,
  readOnly,
  expiresAt,
  asUser,
}: {
  orgName: string;
  readOnly: boolean;
  expiresAt: string;
  asUser?: string | null;
}) {
  const until = new Date(expiresAt);
  const untilLabel = Number.isNaN(until.getTime())
    ? null
    : until.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <span className="flex min-w-0 items-center gap-2">
        {asUser ? <UserRound className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
        <span className="truncate">
          {asUser ? (
            <>
              Viewing as <strong>{asUser}</strong> · {orgName}
            </>
          ) : (
            <>
              Support mode — acting as <strong>{orgName}</strong>
            </>
          )}
        </span>
        {readOnly && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-950/15 px-2 py-0.5 text-xs font-semibold">
            <Eye className="h-3 w-3" />
            Read-only
          </span>
        )}
        {untilLabel && (
          <span className="hidden shrink-0 text-xs opacity-80 sm:inline">until {untilLabel}</span>
        )}
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
