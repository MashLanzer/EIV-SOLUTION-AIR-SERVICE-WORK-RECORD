import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CalendarOff,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  MessageSquare,
  Repeat,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import type { NotificationView } from "@/lib/inappNotify";
import { getLocale, getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

// Icon + tint per notification type. Only state events (approved/returned) carry
// colour, matching the app's rule that hue is reserved for status; everything
// else stays monochrome.
const META: Record<string, { icon: LucideIcon; tone: "neutral" | "success" | "warning" }> = {
  record_submitted: { icon: ClipboardList, tone: "neutral" },
  record_resubmitted: { icon: ClipboardList, tone: "neutral" },
  record_approved: { icon: CheckCircle2, tone: "success" },
  record_returned: { icon: AlertTriangle, tone: "warning" },
  job_scheduled: { icon: CalendarPlus, tone: "neutral" },
  job_reassigned: { icon: UserCheck, tone: "neutral" },
  job_rescheduled: { icon: CalendarClock, tone: "neutral" },
  job_reminder: { icon: CalendarClock, tone: "neutral" },
  job_series: { icon: Repeat, tone: "neutral" },
  time_off_added: { icon: CalendarOff, tone: "neutral" },
  photo_comment: { icon: MessageSquare, tone: "neutral" },
  system: { icon: CreditCard, tone: "neutral" },
};

const TONE_CLASS: Record<"neutral" | "success" | "warning", string> = {
  neutral: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300",
  success: "bg-success-soft text-success-text",
  warning: "bg-warning-soft text-warning-text",
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function Row({
  n,
  title,
  byLabel,
  timeFmt,
}: {
  n: NotificationView;
  title: string;
  byLabel: string;
  timeFmt: Intl.DateTimeFormat;
}) {
  const meta = META[n.type] ?? { icon: ClipboardList, tone: "neutral" as const };
  const Icon = meta.icon;
  const inner = (
    <div className="flex items-start gap-3 px-4 py-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          TONE_CLASS[meta.tone]
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
          <span className="min-w-0 truncate">{title}</span>
          {!n.read && (
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full bg-primary"
            />
          )}
        </p>
        {n.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
            {n.body}
          </p>
        )}
        {n.actorName && (
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
            <UserCheck className="h-3 w-3 shrink-0 text-neutral-400" />
            {byLabel.replace("{name}", n.actorName)}
          </p>
        )}
      </div>
      <time className="shrink-0 pt-0.5 text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
        {timeFmt.format(n.at)}
      </time>
    </div>
  );

  const wrapClass = cn(
    "block border-l-2 transition-colors",
    n.read
      ? "border-transparent"
      : "border-primary bg-primary/[0.04] dark:bg-primary/[0.08]"
  );

  if (n.href) {
    return (
      <Link href={n.href} className={cn(wrapClass, "hover:bg-neutral-50 dark:hover:bg-neutral-800/50")}>
        {inner}
      </Link>
    );
  }
  return <div className={wrapClass}>{inner}</div>;
}

// A time-grouped list of persisted notifications for one tab. Each card is
// self-contained: what happened, the detail, who did it, and when — with unread
// ones marked by an accent bar + dot.
export async function NotificationList({ items }: { items: NotificationView[] }) {
  const locale = await getLocale();
  const t = (await getT()).activity;
  const tf = (await getT()).activityFeed;
  const intlLocale = locale === "es" ? "es-ES" : "en-US";
  const notifTypes = t.notifTypes as Record<string, string>;
  const timeFmt = new Intl.DateTimeFormat(intlLocale, { hour: "numeric", minute: "2-digit" });
  const dateFmt = new Intl.DateTimeFormat(intlLocale, { weekday: "short", month: "short", day: "numeric" });
  const dateFmtWithYear = new Intl.DateTimeFormat(intlLocale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  function dayLabel(d: Date): string {
    const now = new Date();
    const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
    if (diff === 0) return tf.today;
    if (diff === 1) return tf.yesterday;
    return (d.getFullYear() === now.getFullYear() ? dateFmt : dateFmtWithYear).format(d);
  }

  const groups: { key: number; label: string; items: NotificationView[] }[] = [];
  for (const n of items) {
    const key = startOfDay(n.at);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(n);
    else groups.push({ key, label: dayLabel(n.at), items: [n] });
  }

  return (
    <div className="flex flex-col gap-3">
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
            {group.items.map((n) => (
              <Row
                key={n.id}
                n={n}
                title={notifTypes[n.type] ?? n.title}
                byLabel={t.byActor}
                timeFmt={timeFmt}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
