"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  MapPin,
  MessageSquare,
  Tag as TagIcon,
  Trash2,
  User,
  X,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { bulkDeletePhotosAction, bulkTagPhotosAction } from "@/actions/photosBulk";
import { downloadPhotosZip } from "@/lib/clientZip";
import { useT, useLocale } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface FeedPhoto {
  id: string;
  url: string;
  takenAt: string; // ISO
  projectId: string;
  projectName: string;
  takenByName?: string | null;
  hasGps: boolean;
  tagCount: number;
  commentCount: number;
}

function timeAgo(iso: string, t: Dictionary["photos"]): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t.justNow;
  if (m < 60) return t.minutesAgo.replace("{n}", String(m));
  const h = Math.floor(m / 60);
  if (h < 24) return t.hoursAgo.replace("{n}", String(h));
  return t.daysAgo.replace("{n}", String(Math.floor(h / 24)));
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayLabel(iso: string, t: Dictionary["photos"], locale: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diff === 0) return t.today;
  if (diff === 1) return t.yesterday;
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  }).format(d);
}

// Small counts row reused on the thumbnail overlay and the viewer meta bar.
function MetaCounts({ photo, light }: { photo: FeedPhoto; light?: boolean }) {
  return (
    <span className={`flex items-center gap-2 ${light ? "text-white/90" : ""}`}>
      {photo.tagCount > 0 && (
        <span className="flex items-center gap-0.5">
          <TagIcon className="h-3 w-3" />
          {photo.tagCount}
        </span>
      )}
      {photo.commentCount > 0 && (
        <span className="flex items-center gap-0.5">
          <MessageSquare className="h-3 w-3" />
          {photo.commentCount}
        </span>
      )}
      {photo.hasGps && <MapPin className="h-3 w-3" />}
    </span>
  );
}

// Company/team photo feed: photos grouped by day. Tapping one opens a
// full-screen viewer (prev/next across the whole list); a "Select" mode turns
// the grid into a multi-select for bulk download (ZIP), tagging (admin) and
// deleting. `basePath` picks the admin vs worker project route.
export function PhotoFeed({
  photos,
  basePath,
  canTag = false,
  tagSuggestions = [],
}: {
  photos: FeedPhoto[];
  basePath: string;
  // Admins can bulk-tag (tags are a company-wide taxonomy).
  canTag?: boolean;
  tagSuggestions?: string[];
}) {
  const t = useT().photos;
  const tc = useT().common;
  const locale = useLocale();
  const [open, setOpen] = useState<number | null>(null);

  // Selection mode
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagOpen, setTagOpen] = useState(false);
  const [tagName, setTagName] = useState("");
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = useMemo(() => {
    const map = new Map<number, { label: string; items: FeedPhoto[] }>();
    for (const p of photos) {
      const key = startOfDay(new Date(p.takenAt));
      if (!map.has(key)) map.set(key, { label: dayLabel(p.takenAt, t, locale), items: [] });
      map.get(key)!.items.push(p);
    }
    return Array.from(map.values());
  }, [photos, t, locale]);

  const close = useCallback(() => setOpen(null), []);
  const go = useCallback(
    (dir: number) =>
      setOpen((i) => (i == null ? i : (i + dir + photos.length) % photos.length)),
    [photos.length]
  );

  useEffect(() => {
    if (open == null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close, go]);

  const flat = photos;
  const active = open != null ? flat[open] : null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
    setError(null);
  }

  function onThumb(index: number, id: string) {
    if (selectMode) toggle(id);
    else setOpen(index);
  }

  const selectedPhotos = photos.filter((p) => selected.has(p.id));

  async function doDownload() {
    if (selectedPhotos.length === 0) return;
    setZipping(true);
    setError(null);
    try {
      const items = selectedPhotos.map((p, i) => ({
        url: p.url,
        name: `${p.projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "photo"}-${i + 1}.jpg`,
      }));
      const n = await downloadPhotosZip(items, `photos-${Date.now()}.zip`);
      if (n === 0) setError(t.zipFailed);
      else exitSelect();
    } catch {
      setError(t.zipFailed);
    } finally {
      setZipping(false);
    }
  }

  function doDelete() {
    const ids = [...selected];
    startTransition(async () => {
      await bulkDeletePhotosAction(ids);
      exitSelect();
    });
  }

  function doTag() {
    const ids = [...selected];
    const name = tagName.trim();
    if (!name) return;
    startTransition(async () => {
      await bulkTagPhotosAction(ids, name);
      setTagOpen(false);
      setTagName("");
      exitSelect();
    });
  }

  const busy = pending || zipping;

  return (
    <>
      {/* Toolbar: enter/exit select mode */}
      <div className="flex items-center justify-between gap-2">
        {selectMode ? (
          <>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              {t.selectedCount.replace("{n}", String(selected.size))}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSelected(
                    selected.size === photos.length ? new Set() : new Set(photos.map((p) => p.id))
                  )
                }
              >
                {selected.size === photos.length ? t.clearSelection : t.selectAll}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exitSelect}>
                {tc.cancel}
              </Button>
            </div>
          </>
        ) : (
          <>
            <span className="text-xs text-neutral-400 dark:text-neutral-500" />
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectMode(true)}>
              <CheckCircle2 className="h-4 w-4" />
              {t.select}
            </Button>
          </>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-col gap-5">
        {groups.map((group) => {
          const startIndex = flat.indexOf(group.items[0]);
          return (
            <section key={group.label + startIndex} className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {group.label}
                <span className="ml-1.5 font-normal tabular-nums text-neutral-400 dark:text-neutral-500">
                  {group.items.length}
                </span>
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {group.items.map((photo) => {
                  const index = flat.indexOf(photo);
                  const isSel = selected.has(photo.id);
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => onThumb(index, photo.id)}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-lg border transition-all",
                        isSel
                          ? "border-primary ring-2 ring-primary"
                          : "border-neutral-200 dark:border-neutral-800"
                      )}
                      aria-label={
                        selectMode
                          ? t.togglePhoto.replace("{name}", photo.projectName)
                          : t.openPhotoFrom.replace("{name}", photo.projectName)
                      }
                      aria-pressed={selectMode ? isSel : undefined}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt=""
                        className={cn(
                          "h-full w-full object-cover transition-transform group-active:scale-95",
                          isSel && "scale-95"
                        )}
                      />
                      {selectMode && (
                        <span
                          className={cn(
                            "absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full border-2",
                            isSel
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-white/90 bg-black/30"
                          )}
                        >
                          {isSel && <Check className="h-3 w-3" />}
                        </span>
                      )}
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[10px] text-white">
                        <span className="truncate">{photo.projectName}</span>
                        <MetaCounts photo={photo} light />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Sticky bulk action bar */}
      {selectMode && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <Button type="button" size="sm" onClick={doDownload} disabled={busy} className="flex-1">
              <Download className="h-4 w-4" />
              {zipping ? t.zipping : t.downloadZip}
            </Button>
            {canTag && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTagOpen(true)}
                disabled={busy}
                className="flex-1"
              >
                <TagIcon className="h-4 w-4" />
                {t.tagSelected}
              </Button>
            )}
            <ConfirmDialog
              title={t.deleteSelectedTitle}
              description={t.deleteSelectedDesc.replace("{n}", String(selected.size))}
              confirmLabel={t.deleteSelectedConfirm}
              trigger={
                <Button type="button" variant="outline" size="sm" disabled={busy} className="text-destructive-text">
                  <Trash2 className="h-4 w-4" />
                  {t.deleteSelected}
                </Button>
              }
              onConfirm={doDelete}
            />
          </div>
        </div>
      )}

      {/* Bulk tag sheet */}
      <BottomSheet open={tagOpen} onClose={() => setTagOpen(false)} title={t.tagSelected} closeLabel={tc.close}>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {t.tagSelectedHint.replace("{n}", String(selected.size))}
          </p>
          <Input
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            list="bulk-tag-suggestions"
            placeholder={t.addTagPlaceholder}
            autoComplete="off"
            maxLength={30}
          />
          <datalist id="bulk-tag-suggestions">
            {tagSuggestions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <Button type="button" onClick={doTag} disabled={busy || !tagName.trim()} className="w-full">
            <TagIcon className="h-4 w-4" />
            {t.add}
          </Button>
        </div>
      </BottomSheet>

      {active && open != null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between gap-2 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 text-white">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{active.projectName}</div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                {active.takenByName && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {active.takenByName}
                  </span>
                )}
                <span>{timeAgo(active.takenAt, t)}</span>
                <MetaCounts photo={active} light />
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={tc.close}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2">
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label={t.previousPhoto}
                  className="absolute left-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={t.nextPhoto}
                  className="absolute right-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.url} alt="" className="max-h-full max-w-full object-contain" />
          </div>

          <div className="flex items-center justify-between gap-2 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm tabular-nums text-white">
              {open + 1} / {photos.length}
            </span>
            <Link
              href={`${basePath}/${active.projectId}/photos/${active.id}`}
              className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
            >
              <ExternalLink className="h-4 w-4" />
              {t.viewDetails}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
