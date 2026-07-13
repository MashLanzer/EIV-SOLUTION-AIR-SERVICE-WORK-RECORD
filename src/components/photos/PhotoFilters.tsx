"use client";

import { useRouter } from "next/navigation";
import { Tag as TagIcon } from "lucide-react";

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

// Composable photo filters: a horizontally-scrolling row of tag chips plus a
// project dropdown. Both compose into the same query string so they can be
// applied together; navigation is client-side push to re-run the server query.
export function PhotoFilters({
  basePath,
  tags,
  projects,
  activeTag,
  activeProject,
}: {
  basePath: string;
  tags: TagOption[];
  projects: ProjectOption[];
  activeTag: string | null;
  activeProject: string | null;
}) {
  const router = useRouter();
  const t = useT().photos;

  // The project dropdown pushes client-side (Select has no href); tag chips
  // are links that preserve the current project, matching how the status /
  // skill filters compose their query strings across the app.
  function navigate(next: { tag?: string | null; project?: string | null }) {
    const tag = next.tag !== undefined ? next.tag : activeTag;
    const project = next.project !== undefined ? next.project : activeProject;
    const params = new URLSearchParams();
    if (tag) params.set("tag", tag);
    if (project) params.set("project", project);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  function tagHref(tag: string | null) {
    const params = new URLSearchParams();
    if (tag) params.set("tag", tag);
    if (activeProject) params.set("project", activeProject);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const hasTags = tags.length > 0;
  const hasProjects = projects.length > 1;
  if (!hasTags && !hasProjects) return null;

  return (
    <div className="flex flex-col gap-2">
      {hasProjects && (
        <Select
          aria-label={t.filterByProject}
          value={activeProject ?? ""}
          onChange={(e) => navigate({ project: e.target.value || null })}
          className="sm:max-w-xs"
        >
          <option value="">{t.allProjects}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      )}

      {hasTags && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FilterChip href={tagHref(null)} active={activeTag === null}>
            {t.allTags}
          </FilterChip>
          {tags.map((tag) => (
            <FilterChip
              key={tag.name}
              href={tagHref(tag.name)}
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
