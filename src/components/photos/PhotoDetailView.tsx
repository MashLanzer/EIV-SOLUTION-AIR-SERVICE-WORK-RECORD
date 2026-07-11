import Link from "next/link";
import { ArrowLeft, MapPin, Send, Tag as TagIcon, Trash2, X } from "lucide-react";

import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhotoDeleteButton } from "@/components/photos/PhotoDeleteButton";
import { PhotoDownloadButton } from "@/components/photos/PhotoDownloadButton";
import { ZoomableImage } from "@/components/photos/ZoomableImage";
import {
  addCommentAction,
  addTagAction,
  deleteCommentAction,
  removeTagAction,
} from "@/actions/photoMeta";

function fmtDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDateTime(date);
}

export interface PhotoDetailData {
  id: string;
  url: string;
  takenAt: Date;
  takenById: string | null;
  latitude: number | null;
  longitude: number | null;
  project: { id: string; name: string };
  takenBy: { name: string } | null;
  photoTags: { tag: { id: string; name: string } }[];
  comments: {
    id: string;
    body: string;
    createdAt: Date;
    authorId: string | null;
    author: { name: string } | null;
  }[];
}

// Shared photo detail (tags + comments) used by the admin and worker areas.
// Capability flags decide what a worker may do: view tags but not edit them,
// comment, and delete only their own comment / photo.
export function PhotoDetailView({
  photo,
  orgTags,
  basePath,
  canManageTags,
  currentUserId,
  isAdmin,
}: {
  photo: PhotoDetailData;
  orgTags: { name: string }[];
  basePath: string;
  canManageTags: boolean;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const canDelete = isAdmin || photo.takenById === currentUserId;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link
        href={`${basePath}/${photo.project.id}`}
        className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        {photo.project.name}
      </Link>

      <ZoomableImage src={photo.url} alt="Jobsite photo" />

      {/* Who/when + GPS, and the photo actions */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
          <span className="flex items-center gap-1.5">
            {photo.takenBy?.name && (
              <AvatarInitials name={photo.takenBy.name} className="h-6 w-6 text-[10px]" />
            )}
            <span>
              {photo.takenBy?.name ? `${photo.takenBy.name} · ` : ""}
              {timeAgo(photo.takenAt)}
            </span>
          </span>
          {photo.latitude != null && photo.longitude != null && (
            <a
              href={`https://www.openstreetmap.org/?mlat=${photo.latitude}&mlon=${photo.longitude}#map=17/${photo.latitude}/${photo.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary"
            >
              <MapPin className="h-4 w-4" />
              View location
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <PhotoDownloadButton url={photo.url} />
          {canDelete && <PhotoDeleteButton photoId={photo.id} basePath={basePath} />}
        </div>
      </div>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TagIcon className="h-4 w-4" />
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {photo.photoTags.length === 0 && (
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                No tags yet.
              </span>
            )}
            {photo.photoTags.map(({ tag }) =>
              canManageTags ? (
                <form key={tag.id} action={removeTagAction.bind(null, photo.id, tag.id)}>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-sm font-medium text-neutral-700 dark:text-neutral-200 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove tag ${tag.name}`}
                  >
                    <TagIcon className="h-3 w-3" />
                    {tag.name}
                    <X className="h-3.5 w-3.5" />
                  </button>
                </form>
              ) : (
                <span
                  key={tag.id}
                  className="flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-sm font-medium text-neutral-700 dark:text-neutral-200"
                >
                  <TagIcon className="h-3 w-3" />
                  {tag.name}
                </span>
              )
            )}
          </div>
          {canManageTags && (
            <form action={addTagAction.bind(null, photo.id)} className="flex gap-2">
              <Input
                name="name"
                list="org-tags"
                placeholder="Add a tag (e.g. before, roof, damage)"
                autoComplete="off"
                maxLength={30}
              />
              <datalist id="org-tags">
                {orgTags.map((t) => (
                  <option key={t.name} value={t.name} />
                ))}
              </datalist>
              <Button type="submit" variant="outline">
                Add
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle>
            Comments{" "}
            <span className="tabular-nums text-neutral-400">
              ({photo.comments.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {photo.comments.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Be the first to comment.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {photo.comments.map((c) => {
                const canRemove = isAdmin || c.authorId === currentUserId;
                const name = c.author?.name ?? "Someone";
                return (
                  <li key={c.id} className="flex items-start gap-3">
                    <AvatarInitials name={name} className="h-8 w-8" />
                    <div className="min-w-0 flex-1">
                      <div className="rounded-2xl rounded-tl-sm bg-neutral-100 dark:bg-neutral-800 px-3 py-2">
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {name}
                          </span>
                          <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                            {timeAgo(c.createdAt)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm text-neutral-800 dark:text-neutral-200">
                          {c.body}
                        </p>
                      </div>
                      {canRemove && (
                        <form action={deleteCommentAction.bind(null, c.id)} className="mt-1">
                          <button
                            type="submit"
                            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <form
            action={addCommentAction.bind(null, photo.id)}
            className="flex items-end gap-2"
          >
            <Textarea
              name="body"
              required
              rows={2}
              maxLength={2000}
              placeholder="Add a comment..."
              className="flex-1"
            />
            <Button type="submit" size="icon" aria-label="Post comment">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
