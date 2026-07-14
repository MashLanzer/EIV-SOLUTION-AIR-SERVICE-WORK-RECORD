import { LifeBuoy } from "lucide-react";

// Shown to a company's OWN admins (not the impersonator) while a platform
// support session is open on their account — transparency about who's looking.
export function SupportActiveNotice({ expiresAt }: { expiresAt: string }) {
  const until = new Date(expiresAt);
  const untilLabel = Number.isNaN(until.getTime())
    ? null
    : until.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <LifeBuoy className="h-4 w-4 shrink-0" />
      <span>
        Platform support is currently assisting on your account
        {untilLabel ? ` (until ${untilLabel})` : ""}.
      </span>
    </div>
  );
}
