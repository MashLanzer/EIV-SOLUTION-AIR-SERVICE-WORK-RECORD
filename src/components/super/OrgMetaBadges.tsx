import { BellRing, StickyNote } from "lucide-react";

// Tiny inline indicators for a company row: how many internal notes it has and
// how many follow-ups are still open. Only non-zero counts render, so a clean
// account shows nothing. Open reminders use a warning tint to draw the eye.
export function OrgMetaBadges({
  noteCount,
  openReminderCount,
}: {
  noteCount: number;
  openReminderCount: number;
}) {
  if (noteCount === 0 && openReminderCount === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {openReminderCount > 0 && (
        <span
          className="inline-flex items-center gap-0.5 rounded-full bg-warning-soft px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-warning-text"
          title={`${openReminderCount} open follow-up${openReminderCount === 1 ? "" : "s"}`}
        >
          <BellRing className="h-3 w-3" />
          {openReminderCount}
        </span>
      )}
      {noteCount > 0 && (
        <span
          className="inline-flex items-center gap-0.5 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
          title={`${noteCount} internal note${noteCount === 1 ? "" : "s"}`}
        >
          <StickyNote className="h-3 w-3" />
          {noteCount}
        </span>
      )}
    </span>
  );
}
