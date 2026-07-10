import Link from "next/link";
import { Images, MapPin, MessageSquare, Tag as TagIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { getWorkerTeamIds } from "@/lib/projectAccess";
import { requireAuth } from "@/lib/session";
import { cn } from "@/lib/utils";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function WorkerPhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);
  const { tag } = await searchParams;
  const activeTag = tag?.trim().toLowerCase() || null;

  const isAdmin = session.user.role === "ADMIN";
  const teamIds = isAdmin ? null : await getWorkerTeamIds(session.user.id);
  // Restrict every photo query to the worker's team projects.
  const projectScope = isAdmin ? {} : { project: { teamId: { in: teamIds ?? [] } } };

  const [tags, photoRows] = await Promise.all([
    prisma.tag.findMany({
      where: {
        organizationId,
        photoTags: { some: { photo: { organizationId, ...projectScope } } },
      },
      orderBy: { name: "asc" },
      select: { name: true },
    }),
    prisma.photo.findMany({
      where: {
        organizationId,
        ...projectScope,
        ...(activeTag ? { photoTags: { some: { tag: { name: activeTag } } } } : {}),
      },
      orderBy: { takenAt: "desc" },
      take: 90,
      select: {
        id: true,
        url: true,
        takenAt: true,
        latitude: true,
        project: { select: { id: true, name: true } },
        _count: { select: { photoTags: true, comments: true } },
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Photos</h1>
        <span className="text-sm text-neutral-500 dark:text-neutral-400 tabular-nums">
          {photoRows.length} photo{photoRows.length === 1 ? "" : "s"}
        </span>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/records/photos"
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              activeTag === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-600"
            )}
          >
            All
          </Link>
          {tags.map((t) => (
            <Link
              key={t.name}
              href={`/records/photos?tag=${encodeURIComponent(t.name)}`}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                activeTag === t.name
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400 dark:hover:border-neutral-600"
              )}
            >
              <TagIcon className="h-3.5 w-3.5" />
              {t.name}
            </Link>
          ))}
        </div>
      )}

      {photoRows.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Images}
              title={activeTag ? `No photos tagged "${activeTag}"` : "No photos yet"}
              description={
                activeTag
                  ? "Try a different tag, or clear the filter to see everything."
                  : "Photos from your team's projects show up here, newest first."
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photoRows.map((photo) => (
            <Link
              key={photo.id}
              href={`/records/projects/${photo.project.id}/photos/${photo.id}`}
              className="group flex flex-col gap-1.5"
            >
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt="Jobsite photo"
                  className="aspect-square w-full rounded-lg border border-neutral-200 dark:border-neutral-800 object-cover transition-opacity group-hover:opacity-90"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 rounded-b-lg bg-gradient-to-t from-black/60 to-transparent px-2 py-1 text-[10px] text-white">
                  <span className="tabular-nums">{timeAgo(photo.takenAt)}</span>
                  <span className="flex items-center gap-1.5">
                    {photo._count.photoTags > 0 && (
                      <span className="flex items-center gap-0.5">
                        <TagIcon className="h-3 w-3" />
                        {photo._count.photoTags}
                      </span>
                    )}
                    {photo._count.comments > 0 && (
                      <span className="flex items-center gap-0.5">
                        <MessageSquare className="h-3 w-3" />
                        {photo._count.comments}
                      </span>
                    )}
                    {photo.latitude != null && <MapPin className="h-3 w-3" />}
                  </span>
                </div>
              </div>
              <span className="truncate text-xs font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-primary">
                {photo.project.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
