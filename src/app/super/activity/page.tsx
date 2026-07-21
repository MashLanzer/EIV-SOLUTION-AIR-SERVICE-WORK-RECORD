import Link from "next/link";
import {
  Activity,
  Building2,
  CreditCard,
  LogIn,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { requireSuperAdmin } from "@/lib/superAdmin";
import { getPlatformFeed, type PlatformFeedItem } from "@/lib/platform";
import { getGlobalAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Icon + accent tone for an event, inferred from its audit action key.
function eventStyle(action: string): { Icon: LucideIcon; tone: string } {
  if (action.includes("suspend")) return { Icon: PauseCircle, tone: "text-warning-text" };
  if (action.includes("reactivat") || action.includes("restore"))
    return { Icon: PlayCircle, tone: "text-success-text" };
  if (action.includes("plan")) return { Icon: CreditCard, tone: "text-neutral-500 dark:text-neutral-400" };
  if (action.includes("admin")) return { Icon: ShieldCheck, tone: "text-neutral-500 dark:text-neutral-400" };
  if (action.includes("support") || action.includes("enter") || action.includes("impersonat"))
    return { Icon: LogIn, tone: "text-neutral-500 dark:text-neutral-400" };
  return { Icon: Activity, tone: "text-neutral-500 dark:text-neutral-400" };
}

function dayLabel(date: Date, now: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
}

export default async function SuperActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireSuperAdmin();
  const { view } = await searchParams;
  const allMode = view === "all";
  const now = new Date();
  const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
  const auditTimeFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Activity</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {allMode
            ? "Every logged change across every company, newest first."
            : "The platform pulse — signups, plan and lifecycle changes, admin grants and support sessions."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip href="/super/activity" active={!allMode}>
          Pulse
        </FilterChip>
        <FilterChip href="/super/activity?view=all" active={allMode}>
          All activity
        </FilterChip>
      </div>

      {allMode ? <AllActivity fmt={auditTimeFmt} /> : <Pulse now={now} timeFmt={timeFmt} />}
    </div>
  );
}

// The curated platform pulse: signups + platform-level events, grouped by day.
async function Pulse({ now, timeFmt }: { now: Date; timeFmt: Intl.DateTimeFormat }) {
  const feed = await getPlatformFeed();

  const groups: { key: string; label: string; items: PlatformFeedItem[] }[] = [];
  const byKey = new Map<string, PlatformFeedItem[]>();
  for (const item of feed) {
    const key = item.date.toISOString().slice(0, 10);
    let arr = byKey.get(key);
    if (!arr) {
      arr = [];
      byKey.set(key, arr);
      groups.push({ key, label: dayLabel(item.date, now), items: arr });
    }
    arr.push(item);
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState icon={Activity} title="Nothing yet" description="" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            {group.label}
          </h2>
          <Card>
            <CardContent className="stagger-children flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
              {group.items.map((item) => {
                const { Icon, tone } =
                  item.kind === "signup"
                    ? { Icon: Building2, tone: "text-success-text" }
                    : eventStyle(item.action);
                const title = item.kind === "signup" ? `${item.orgName} signed up` : item.summary;
                const orgId = item.orgId;
                const meta =
                  item.kind === "signup"
                    ? "New company"
                    : [item.actorName, item.orgName].filter(Boolean).join(" · ");

                return (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-neutral-900 dark:text-neutral-100">
                        {orgId ? (
                          <Link href={`/super/orgs/${orgId}`} className="hover:text-primary">
                            {title}
                          </Link>
                        ) : (
                          title
                        )}
                      </div>
                      {meta && <div className="truncate text-xs text-neutral-400">{meta}</div>}
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-neutral-400">
                      {timeFmt.format(item.date)}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      ))}
    </>
  );
}

// The full audit log across every company (the old Audit tab).
async function AllActivity({ fmt }: { fmt: Intl.DateTimeFormat }) {
  const events = await getGlobalAuditLog();

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <EmptyState icon={Activity} title="Nothing logged yet" description="" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col divide-y divide-neutral-100 p-0 dark:divide-neutral-800">
        {events.map((e) => (
          <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-900 dark:text-neutral-100">{e.summary}</span>
                {e.isPlatform && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                    <ShieldCheck className="h-3 w-3" />
                    Platform
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-neutral-400">
                {e.organization ? (
                  <Link href={`/super/orgs/${e.organization.id}`} className="hover:text-primary">
                    {e.organization.name}
                  </Link>
                ) : (
                  <span>Platform</span>
                )}
                <span>·</span>
                <span>{e.actorName}</span>
              </div>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-neutral-400">{fmt.format(e.createdAt)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
