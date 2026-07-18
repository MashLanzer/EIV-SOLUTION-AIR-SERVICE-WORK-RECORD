"use client";

import { useRef, useState, useTransition } from "react";
import { ImageIcon, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SettingsCustomRow } from "@/components/settings/SettingsList";
import {
  removeCompanyLogoAction,
  updateCompanyLogoAction,
} from "@/actions/organization";
import { useT } from "@/components/i18n/LocaleProvider";

// The company logo shown on the work-record PDF. Upload/replace via a hidden
// file input; the current logo comes from the `url` prop (the action's
// revalidate refreshes it). Remove clears it. Admin-only, org-scoped.
export function CompanyLogoRow({ url }: { url: string | null }) {
  const c = useT().settings.company;
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set("logo", file);
    startTransition(async () => {
      const result = await updateCompanyLogoAction(undefined, fd);
      if (!result?.ok) setError(result?.error ?? c.logoGenericError);
    });
  }

  function onRemove() {
    setError(null);
    startTransition(async () => {
      await removeCompanyLogoAction();
    });
  }

  return (
    <SettingsCustomRow className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={c.logo} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {c.logo}
          </span>
          <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
            {c.logoHint}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
          >
            <Upload className="h-3.5 w-3.5" />
            {url ? c.replace : c.upload}
          </Button>
          {url && (
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={onRemove}
              disabled={pending}
              aria-label={c.removeLogo}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onPick}
        />
      </div>
      {error && <p className="text-xs text-destructive-text">{error}</p>}
    </SettingsCustomRow>
  );
}
