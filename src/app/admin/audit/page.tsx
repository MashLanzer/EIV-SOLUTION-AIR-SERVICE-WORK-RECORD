import Link from "next/link";
import {
  Building2,
  Contact,
  FileText,
  FolderKanban,
  History,
  Receipt,
  Search,
  SearchX,
  Settings,
  Sheet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { getAuditLog, getAuditTypeCounts } from "@/lib/audit";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getLocale, getT } from "@/lib/i18n/server";

const ICON: Record<string, typeof Contact> = {
  customer: Contact,
  project: FolderKanban,
  invoice: Receipt,
  estimate: FileText,
  organization: Building2,
  settings: Settings,
};

// A calendar-day key (server timezone) used to group events under day headers.
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);
  const { q, type: rawType } = await searchParams;
  const query = q?.trim() || undefined;
  const type = rawType?.trim() || undefined;

  const [events, typeCounts] = await Promise.all([
    getAuditLog(organizationId, { type, query, take: 250 }),
    getAuditTypeCounts(organizationId, query),
  ]);

  const dict = await getT();
  const t = dict.audit;
  const typeLabels = t.types as Record<string, string>;
  const locale = await getLocale();
  const timeFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    timeStyle: "short",
  });
  const dayFmt = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const totalCount = typeCounts.reduce((s, c) => s + c.count, 0);
  const chips = [
    { type: undefined as string | undefined, label: t.filterAll, count: totalCount },
    ...[...typeCounts]
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
      .map((c) => ({ type: c.type, label: typeLabels[c.type] ?? c.type, count: c.count })),
  ];
  const chipHref = (next?: string) => {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (next) p.set("type", next);
    const s = p.toString();
    return s ? `/admin/audit?${s}` : "/admin/audit";
  };

  const exportParams = new URLSearchParams();
  if (query) exportParams.set("q", query);
  if (type) exportParams.set("type", type);
  const exportHref = `/admin/audit/export${
    exportParams.toString() ? `?${exportParams.toString()}` : ""
  }`;

  // Group events under day headers (Today / Yesterday / date), keeping the
  // newest-first order the query already produced.
  const now = new Date();
  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const groups: { key: string; label: string; events: typeof events }[] = [];
  for (const e of events) {
    const key = dayKey(e.createdAt);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const label = key === todayKey ? t.today : key === yesterdayKey ? t.yesterday : dayFmt.format(e.createdAt);
      group = { key, label, events: [] };
      groups.push(group);
    }
    group.events.push(e);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.title}
        description={t.desc}
        action={
          totalCount > 0 ? (
            <Button asChild variant="outline" size="sm">
              <a href={exportHref}>
                <Sheet className="h-4 w-4" />
                <span className="hidden sm:inline">{t.exportCsv}</span>
              </a>
            </Button>
          ) : undefined
        }
      />

      {totalCount > 0 && (
        <>
          <form method="get" className="relative max-w-md">
            {type && <input type="hidden" name="type" value={type} />}
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
            <Input
              type="search"
              name="q"
              placeholder={t.searchPlaceholder}
              defaultValue={query}
              className="pl-9"
              aria-label={t.searchAria}
            />
          </form>

          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((chip) => (
              <FilterChip
                key={chip.label}
                href={chipHref(chip.type)}
                active={(chip.type ?? undefined) === (type ?? undefined)}
                count={chip.count}
              >
                {chip.label}
              </FilterChip>
            ))}
          </div>
        </>
      )}

      {events.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            {query || type ? (
              <EmptyState
                icon={SearchX}
                title={t.noMatches}
                description={t.noMatchesDesc}
                action={
                  <Button asChild variant="outline" className="mt-2">
                    <Link href="/admin/audit">{t.clearFilters}</Link>
                  </Button>
                }
              />
            ) : (
              <EmptyState icon={History} title={t.empty} description={t.emptyDesc} />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <section key={group.key} className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {group.label}
              </h2>
              <Card>
                <CardContent className="flex flex-col divide-y divide-neutral-100 p-4 dark:divide-neutral-800">
                  {group.events.map((e) => {
                    const Icon = ICON[e.entityType] ?? History;
                    return (
                      <div key={e.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-neutral-900 dark:text-neutral-100">{e.summary}</p>
                          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                            {t.by.replace("{name}", e.actorName)} · {timeFmt.format(e.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
