"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/components/i18n/LocaleProvider";
import { clearDraft, draftHasContent, listDrafts } from "@/lib/draftStore";

interface DraftItem {
  key: string;
  title: string;
  subtitle: string | null;
}

// Where a stored draft resumes. Today only the new-record autosave key exists;
// anything else falls back to the new-record form.
function resumeHref(key: string): string {
  return key.startsWith("new-record") ? "/records/new" : "/records/new";
}

function toItem(key: string, value: unknown, untitled: string): DraftItem | null {
  if (!draftHasContent(value as Record<string, unknown>)) return null;
  const v = (value ?? {}) as Record<string, unknown>;
  const job = typeof v.jobNumber === "string" ? v.jobNumber.trim() : "";
  const customer = typeof v.customerName === "string" ? v.customerName.trim() : "";
  const type = typeof v.typeOfWork === "string" ? v.typeOfWork.trim() : "";
  const title = customer || (job ? `#${job}` : "") || untitled;
  const subtitle = [job && customer ? `#${job}` : "", type].filter(Boolean).join(" · ") || null;
  return { key, title, subtitle };
}

export function DraftsInbox() {
  const t = useT().drafts;
  const [items, setItems] = useState<DraftItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    void listDrafts().then((drafts) => {
      if (!alive) return;
      setItems(
        drafts
          .map((d) => toItem(d.key, d.value, t.untitled))
          .filter((i): i is DraftItem => i !== null)
      );
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function discard(key: string) {
    await clearDraft(key);
    setItems((prev) => (prev ? prev.filter((i) => i.key !== key) : prev));
  }

  if (items === null) return null; // first client tick
  if (items.length === 0) {
    return <EmptyState icon={FileText} title={t.emptyTitle} description={t.emptyDesc} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {item.title}
            </p>
            {item.subtitle && (
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {item.subtitle}
              </p>
            )}
          </div>
          <Link
            href={resumeHref(item.key)}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
          >
            {t.resume}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => discard(item.key)}
            className="shrink-0 text-neutral-400 hover:text-destructive"
            aria-label={t.discard}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
