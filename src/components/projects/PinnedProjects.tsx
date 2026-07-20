import Link from "next/link";
import { FolderKanban, Pin } from "lucide-react";

import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { getT } from "@/lib/i18n/server";
import type { ProjectStatus } from "@prisma/client";

export interface PinnedProjectItem {
  id: string;
  name: string;
  status: ProjectStatus;
  customerName: string | null;
}

// The worker's "Pinned" quick-access strip: horizontally scrolling cards linking
// straight to each pinned project. Rendered only when there's at least one pin.
export async function PinnedProjects({ projects }: { projects: PinnedProjectItem[] }) {
  if (projects.length === 0) return null;
  const t = (await getT()).records;

  return (
    <section className="flex flex-col gap-2">
      <span className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        <Pin className="h-3.5 w-3.5 fill-current" />
        {t.pinned}
      </span>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={`/records/projects/${p.id}`}
            className="flex w-44 shrink-0 flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <FolderKanban className="h-4 w-4" />
              </span>
              <ProjectStatusBadge status={p.status} />
            </div>
            <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {p.name}
            </span>
            {p.customerName && (
              <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {p.customerName}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
