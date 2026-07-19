"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProjectStatus } from "@prisma/client";
import {
  ArrowRight,
  ChevronRight,
  ClipboardList,
  Contact,
  FilePlus2,
  FolderKanban,
  Image as ImageIcon,
  MapPin,
  Navigation,
} from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/projects/ProjectStatusBadge";
import { TeamChip } from "@/components/teams/TeamColorDot";
import { useT } from "@/components/i18n/LocaleProvider";

export type WorkerProjectData = {
  id: string;
  name: string;
  address: string | null;
  status: ProjectStatus;
  customerName: string | null;
  team: { id: string; name: string; color: string | null } | null;
  records: number;
  photos: number;
  checklistDone: number;
  checklistTotal: number;
};

const mapsHref = (address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const t = useT().projects;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>{t.checklist}</span>
        <span className="tabular-nums">
          {done}/{total} · {pct}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className="h-full rounded-full bg-neutral-800 transition-all dark:bg-neutral-200"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// A worker project card that opens a quick-peek bottom sheet on tap (anywhere on
// the card) — mirroring the admin card anatomy and the worker records peek. The
// sheet carries the summary + quick actions (directions, start a record, open
// the full project) so a jobsite can be triaged without leaving the list.
function ProjectCard({
  project,
  onOpen,
}: {
  project: WorkerProjectData;
  onOpen: (p: WorkerProjectData) => void;
}) {
  const t = useT().projects;
  return (
    <Card className="transition-colors hover:border-neutral-300 dark:hover:border-neutral-700">
      <button
        type="button"
        onClick={() => onOpen(project)}
        aria-label={t.openProjectAria.replace("{name}", project.name)}
        className="flex w-full flex-col gap-3 rounded-xl p-4 text-left transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <FolderKanban className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 truncate font-semibold text-neutral-900 dark:text-neutral-100">
                {project.name}
              </span>
              <ProjectStatusBadge status={project.status} />
            </div>
            <div className="mt-0.5 flex items-start gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
              {project.address ? (
                <>
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0">{project.address}</span>
                </>
              ) : (
                <span className="text-neutral-400 dark:text-neutral-600">{t.noAddress}</span>
              )}
            </div>
            {project.customerName && (
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                <Contact className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{project.customerName}</span>
              </div>
            )}
          </div>
        </div>

        {project.checklistTotal > 0 && (
          <ProgressBar done={project.checklistDone} total={project.checklistTotal} />
        )}

        <div className="flex items-center gap-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          {project.team && (
            <TeamChip name={project.team.name} color={project.team.color} seed={project.team.id} />
          )}
          <span className="flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            {(project.photos === 1 ? t.photoCountOne : t.photoCountMany).replace(
              "{n}",
              String(project.photos)
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            {(project.records === 1 ? t.jobCountOne : t.jobCountMany).replace(
              "{n}",
              String(project.records)
            )}
          </span>
          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
        </div>
      </button>
    </Card>
  );
}

export function WorkerProjectList({ projects }: { projects: WorkerProjectData[] }) {
  const t = useT().projects;
  const tc = useT().common;
  const [peek, setPeek] = useState<WorkerProjectData | null>(null);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} onOpen={setPeek} />
        ))}
      </div>

      <BottomSheet
        open={peek !== null}
        onClose={() => setPeek(null)}
        title={peek?.name ?? ""}
        closeLabel={tc.close}
      >
        {peek && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <ProjectStatusBadge status={peek.status} />
              {peek.team && (
                <TeamChip name={peek.team.name} color={peek.team.color} seed={peek.team.id} />
              )}
            </div>

            {/* Customer + directions to the jobsite */}
            {peek.address ? (
              <a
                href={mapsHref(peek.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-800/50 dark:hover:border-neutral-700"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                <span className="min-w-0 flex-1">
                  {peek.customerName && (
                    <span className="block text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {peek.customerName}
                    </span>
                  )}
                  <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {peek.address}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 self-center text-xs font-medium text-primary">
                  <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.directions}
                </span>
              </a>
            ) : (
              peek.customerName && (
                <div className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                  <Contact className="h-4 w-4 shrink-0 text-neutral-400" />
                  {peek.customerName}
                </div>
              )
            )}

            {peek.checklistTotal > 0 && (
              <ProgressBar done={peek.checklistDone} total={peek.checklistTotal} />
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                <ClipboardList className="h-3.5 w-3.5" />
                {(peek.records === 1 ? t.jobCountOne : t.jobCountMany).replace(
                  "{n}",
                  String(peek.records)
                )}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                <ImageIcon className="h-3.5 w-3.5" />
                {(peek.photos === 1 ? t.photoCountOne : t.photoCountMany).replace(
                  "{n}",
                  String(peek.photos)
                )}
              </span>
            </div>

            <div className="flex flex-col gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
              <Button asChild variant="outline" className="w-full">
                <Link href={`/records/new?projectId=${peek.id}`}>
                  <FilePlus2 className="h-4 w-4" />
                  {t.startRecordHere}
                </Link>
              </Button>
              <Button asChild className="w-full">
                <Link href={`/records/projects/${peek.id}`}>
                  {t.viewProject}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
