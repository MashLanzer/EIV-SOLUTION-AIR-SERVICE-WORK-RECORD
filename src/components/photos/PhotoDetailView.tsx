import Link from "next/link";
import { ArrowLeft, MapPin, Send, Tag as TagIcon, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

export interface PhotoDetailData {
  id: string;
  url: string;
  takenAt: Date;
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
// comment, and delete only their own comment.
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
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link
        href={`${basePath}/${photo.project.id}`}
        className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        <ArrowLeft className="h-4 w-4" />
        {photo.project.name}
      </Link>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt="Jobsite photo"
        className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 object-contain"
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
        <span>
          {photo.takenBy?.name ? `${photo.takenBy.name} · ` : ""}
          {fmtDateTime(photo.takenAt)}
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
                    className="flex items-center gap-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-2.5 py-1 text-sm text-neutral-700 dark:text-neutral-300 hover:border-destructive hover:text-destructive"
                    aria-label={`Remove tag ${tag.name}`}
                  >
                    {tag.name}
                    <X className="h-3.5 w-3.5" />
                  </button>
                </form>
              ) : (
                <span
                  key={tag.id}
                  className="flex items-center gap-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-2.5 py-1 text-sm text-neutral-700 dark:text-neutral-300"
                >
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
            <ul className="flex flex-col gap-3">
              {photo.comments.map((c) => {
                const canDelete = isAdmin || c.authorId === currentUserId;
                return (
                  <li key={c.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          {c.author?.name ?? "Someone"}
                        </span>
                        <span>{fmtDateTime(c.createdAt)}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm text-neutral-900 dark:text-neutral-100">
                        {c.body}
                      </p>
                    </div>
                    {canDelete && (
                      <form action={deleteCommentAction.bind(null, c.id)}>
                        <button
                          type="submit"
                          aria-label="Delete comment"
                          className="shrink-0 text-neutral-400 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <form
            action={addCommentAction.bind(null, photo.id)}
            className="flex flex-col gap-2"
          >
            <Textarea
              name="body"
              required
              rows={2}
              maxLength={2000}
              placeholder="Add a comment..."
            />
            <div>
              <Button type="submit">
                <Send className="h-4 w-4" />
                Post
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
