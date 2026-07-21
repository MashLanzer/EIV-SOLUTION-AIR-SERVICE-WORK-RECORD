import Link from "next/link";
import { ArrowDown, Flag } from "lucide-react";

import { HealthDot } from "@/components/super/HealthDot";
import { planLabel } from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { OrgSort, OrgSummary } from "@/lib/platform";

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "2-digit", timeZone: "UTC" });

// A header cell that becomes a sort link when it maps to a sort key; the active
// column shows a down arrow.
function Th({
  label,
  sort,
  align = "left",
  currentSort,
  sortHref,
}: {
  label: string;
  sort?: OrgSort;
  align?: "left" | "right";
  currentSort: OrgSort;
  sortHref: (sort: OrgSort) => string;
}) {
  const active = sort !== undefined && currentSort === sort;
  const content = (
    <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
      {label}
      {active && <ArrowDown className="h-3 w-3" />}
    </span>
  );
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide",
        align === "right" ? "text-right" : "text-left",
        active ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-500 dark:text-neutral-400"
      )}
    >
      {sort ? (
        <Link href={sortHref(sort)} className="hover:text-neutral-900 dark:hover:text-neutral-100">
          {content}
        </Link>
      ) : (
        content
      )}
    </th>
  );
}

// Dense, sortable KPI table for comparing companies at a glance — the "table"
// view of the Companies page.
export function OrgTable({
  orgs,
  currentSort,
  sortHref,
}: {
  orgs: OrgSummary[];
  currentSort: OrgSort;
  sortHref: (sort: OrgSort) => string;
}) {
  const th = (label: string, sort?: OrgSort, align?: "left" | "right") => (
    <Th label={label} sort={sort} align={align} currentSort={currentSort} sortHref={sortHref} />
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50">
            {th("Company", "name")}
            {th("Health", "health")}
            {th("Plan")}
            {th("Users", "users", "right")}
            {th("Records", "records", "right")}
            {th("Invoices", undefined, "right")}
            {th("Last active", "recent", "right")}
            {th("Created", "newest", "right")}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
          {orgs.map((org) => (
            <tr key={org.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
              <td className="px-3 py-2">
                <Link href={`/super/orgs/${org.id}`} className="flex items-center gap-2">
                  <HealthDot health={org.health} />
                  {org.watched && (
                    <Flag className="h-3 w-3 shrink-0 fill-current text-primary" aria-label="Watching" />
                  )}
                  <span className="truncate font-medium text-neutral-900 hover:text-primary dark:text-neutral-100">
                    {org.name}
                  </span>
                  {!org.active && (
                    <span className="shrink-0 rounded-full bg-destructive-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive-text">
                      Susp
                    </span>
                  )}
                </Link>
              </td>
              <td className="whitespace-nowrap px-3 py-2 tabular-nums text-neutral-600 dark:text-neutral-300">
                {org.health.score}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-neutral-600 dark:text-neutral-300">
                {planLabel(org.plan)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-neutral-700 dark:text-neutral-200">
                {org.users}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-neutral-700 dark:text-neutral-200">
                {org.records}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-neutral-700 dark:text-neutral-200">
                {org.invoices}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                {org.lastActivityAt ? dateFmt.format(org.lastActivityAt) : "—"}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-neutral-500 dark:text-neutral-400">
                {dateFmt.format(org.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
