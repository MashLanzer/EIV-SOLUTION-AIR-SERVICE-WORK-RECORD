import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Contact,
  FolderKanban,
  Image as ImageIcon,
  MessageSquare,
  UserPlus,
  Users2,
  type LucideIcon,
} from "lucide-react";

import type { ActivityEvent, ActivityType } from "@/lib/activity";
import { getLocale, getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

// Icon + tint per event type. Only state events (approved/returned) carry
// colour, matching the app's rule that hue is reserved for status; everything
// else stays monochrome.
const META: Record<ActivityType, { icon: LucideIcon; tone: "neutral" | "success" | "warning" }> = {
  record_submitted: { icon: ClipboardList, tone: "neutral" },
  record_approved: { icon: CheckCircle2, tone: "success" },
  record_returned: { icon: AlertTriangle, tone: "warning" },
  photo_added: { icon: ImageIcon, tone: "neutral" },
  comment_added: { icon: MessageSquare, tone: "neutral" },
  project_created: { icon: FolderKanban, tone: "neutral" },
  worker_added: { icon: UserPlus, tone: "neutral" },
  customer_added: { icon: Contact, tone: "neutral" },
  team_added: { icon: Users2, tone: "neutral" },
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const TONE_CLASS: Record<"neutral" | "success" | "warning", string> = {
  neutral: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300",
  success: "bg-success-soft text-success-text",
  warning: "bg-warning-soft text-warning-text",
};

function EventRow({
  event,
  timeFmt,
}: {
  event: ActivityEvent;
  timeFmt: Intl.DateTimeFormat;
}) {
  const { icon: Icon, tone } = META[event.type];
  const inner = (
    <div className="flex items-start gap-3 px-4 py-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          TONE_CLASS[tone]
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {event.title}
        </p>
        {event.detail && (
          <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
            {event.detail}
          </p>
        )}
      </div>
      <time className="shrink-0 pt-0.5 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
        {timeFmt.format(event.at)}
      </time>
    </div>
  );

  if (event.href) {
    return (
      <Link
        href={event.href}
        className="block transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

export async function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const locale = await getLocale();
  const t = (await getT()).activityFeed;
  const intlLocale = locale === "es" ? "es-ES" : "en-US";
  const timeFmt = new Intl.DateTimeFormat(intlLocale, {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateFmt = new Intl.DateTimeFormat(intlLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const dateFmtWithYear = new Intl.DateTimeFormat(intlLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  function dayLabel(d: Date): string {
    const now = new Date();
    const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
    if (diff === 0) return t.today;
    if (diff === 1) return t.yesterday;
    return (d.getFullYear() === now.getFullYear() ? dateFmt : dateFmtWithYear).format(d);
  }

  // Group by calendar day, preserving the incoming (newest-first) order.
  const groups: { key: number; label: string; items: ActivityEvent[] }[] = [];
  for (const e of events) {
    const key = startOfDay(e.at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(e);
    } else {
      groups.push({ key, label: dayLabel(e.at), items: [e] });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group, gi) => (
        <div
          key={group.key}
          className="flex animate-fade-up flex-col gap-1.5"
          style={{ animationDelay: `${Math.min(gi * 40, 160)}ms`, animationFillMode: "both" }}
        >
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {group.label}
          </h2>
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 divide-y divide-neutral-100 dark:divide-neutral-800/70">
            {group.items.map((event) => (
              <EventRow key={event.id} event={event} timeFmt={timeFmt} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
