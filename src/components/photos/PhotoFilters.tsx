"use client";

import { useRouter } from "next/navigation";
import { Tag as TagIcon } from "lucide-react";

import { Select } from "@/components/ui/select";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

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

  function navigate(next: { tag?: string | null; project?: string | null }) {
    const tag = next.tag !== undefined ? next.tag : activeTag;
    const project = next.project !== undefined ? next.project : activeProject;
    const params = new URLSearchParams();
    if (tag) params.set("tag", tag);
    if (project) params.set("project", project);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
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
          <button
            type="button"
            onClick={() => navigate({ tag: null })}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-sm transition-colors",
              activeTag === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-600"
            )}
          >
            {t.allTags}
          </button>
          {tags.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => navigate({ tag: t.name })}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                activeTag === t.name
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-600"
              )}
            >
              <TagIcon className="h-3.5 w-3.5" />
              {t.name}
              {t.count != null && (
                <span className="tabular-nums opacity-60">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
