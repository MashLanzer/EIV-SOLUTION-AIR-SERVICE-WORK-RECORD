"use client";

import { useRouter } from "next/navigation";
import { Tag as TagIcon, TagsIcon } from "lucide-react";

import { FilterChip } from "@/components/ui/filter-chip";
import { Select } from "@/components/ui/select";
import { useT } from "@/components/i18n/LocaleProvider";

interface TagOption {
  name: string;
  count?: number;
}
interface ProjectOption {
  id: string;
  name: string;
}
interface PersonOption {
  id: string;
  name: string;
}

export type PhotoRange = "all" | "today" | "7d" | "30d";

// Composable photo filters: project + photographer dropdowns, a date-range
// chip row, an "untagged" quick toggle, and the tag chips. Everything composes
// into one query string so filters stack; navigation is a client-side push that
// re-runs the server query.
// One source-category chip: which part of the app the photos came from.
interface SourceOption {
  value: string; // "project" | "checklist" | "record"
  label: string;
  count: number;
}

export function PhotoFilters({
  basePath,
  tags,
  projects,
  photographers,
  sources = [],
  activeTag,
  activeProject,
  activePhotographer,
  activeSource,
  activeRange,
  activeUntagged,
}: {
  basePath: string;
  tags: TagOption[];
  projects: ProjectOption[];
  // Optional "who took it" filter (admin feed only).
  photographers?: PersonOption[];
  // Source categories present (with counts); empty hides the row.
  sources?: SourceOption[];
  activeTag: string | null;
  activeProject: string | null;
  activePhotographer?: string | null;
  activeSource?: string | null;
  activeRange: PhotoRange;
  activeUntagged: boolean;
}) {
  const router = useRouter();
  const t = useT().photos;

  // Current state, so each control can flip just its own key and keep the rest.
  const state = {
    tag: activeTag,
    project: activeProject,
    by: activePhotographer ?? null,
    source: activeSource ?? null,
    range: activeRange,
    untagged: activeUntagged,
  };

  function hrefFor(next: Partial<typeof state>) {
    const s = { ...state, ...next };
    const p = new URLSearchParams();
    if (s.tag) p.set("tag", s.tag);
    if (s.project) p.set("project", s.project);
    if (s.by) p.set("by", s.by);
    if (s.source) p.set("source", s.source);
    if (s.range && s.range !== "all") p.set("range", s.range);
    if (s.untagged) p.set("untagged", "1");
    const qs = p.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  function navigate(next: Partial<typeof state>) {
    router.push(hrefFor(next));
  }

  const hasTags = tags.length > 0;
  const hasProjects = projects.length > 1;
  const hasPhotographers = (photographers?.length ?? 0) > 1;

  const ranges: { value: PhotoRange; label: string }[] = [
    { value: "all", label: t.rangeAll },
    { value: "today", label: t.rangeToday },
    { value: "7d", label: t.range7d },
    { value: "30d", label: t.range30d },
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Source categories — which part of the app the photos came from. Shown
          only when there's more than one source to switch between. */}
      {sources.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip href={hrefFor({ source: null })} active={!activeSource}>
            {t.allSources}
          </FilterChip>
          {sources.map((s) => (
            <FilterChip
              key={s.value}
              href={hrefFor({ source: s.value })}
              active={activeSource === s.value}
              count={s.count}
            >
              {s.label}
            </FilterChip>
          ))}
        </div>
      )}

      {(hasProjects || hasPhotographers) && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:max-w-xl">
          {hasProjects && (
            <Select
              aria-label={t.filterByProject}
              value={activeProject ?? ""}
              onChange={(e) => navigate({ project: e.target.value || null })}
            >
              <option value="">{t.allProjects}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          )}
          {hasPhotographers && (
            <Select
              aria-label={t.filterByPhotographer}
              value={activePhotographer ?? ""}
              onChange={(e) => navigate({ by: e.target.value || null })}
            >
              <option value="">{t.allPhotographers}</option>
              {photographers!.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      )}

      {/* Date range + untagged quick toggle */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ranges.map((r) => (
          <FilterChip key={r.value} href={hrefFor({ range: r.value })} active={activeRange === r.value}>
            {r.label}
          </FilterChip>
        ))}
        {hasTags && (
          <FilterChip href={hrefFor({ untagged: !activeUntagged })} active={activeUntagged}>
            <TagsIcon className="h-3.5 w-3.5" />
            {t.untagged}
          </FilterChip>
        )}
      </div>

      {hasTags && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip href={hrefFor({ tag: null })} active={activeTag === null && !activeUntagged}>
            {t.allTags}
          </FilterChip>
          {tags.map((tag) => (
            <FilterChip
              key={tag.name}
              href={hrefFor({ tag: tag.name, untagged: false })}
              active={activeTag === tag.name}
              count={tag.count}
            >
              <TagIcon className="h-3.5 w-3.5" />
              {tag.name}
            </FilterChip>
          ))}
        </div>
      )}
    </div>
  );
}
