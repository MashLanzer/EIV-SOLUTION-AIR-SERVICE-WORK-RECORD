"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, Mail, Share2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type EmailResult = { ok: true } | { error: string };

export interface DocumentActionsLabels {
  share: string;
  stopSharing: string;
  copyLink: string;
  copied: string;
  shareHint: string;
  duplicate: string;
  email: string;
  emailSending: string;
  emailSent: string;
  delete: string;
  deleteConfirm: string;
  emailErrors: Record<string, string>;
}

// Compact action grid for estimate/invoice detail pages: Share, Duplicate,
// Email and Delete as icon tiles (same visual language as the dashboard quick
// actions) instead of a tall stack of full-width buttons. Sharing expands a
// link box below the grid; email swaps its tile to a sending/sent state; delete
// confirms first. The doc-type differences (public URL path + bound server
// actions + labels) are all passed in, so one component serves both.
export function DocumentActions({
  initialToken,
  publicPath,
  shareAction,
  unshareAction,
  duplicateAction,
  emailAction,
  deleteAction,
  labels,
}: {
  initialToken: string | null;
  publicPath: "estimate" | "invoice";
  shareAction: () => Promise<{ token: string } | null>;
  unshareAction: () => Promise<unknown>;
  duplicateAction: () => Promise<unknown>;
  emailAction: () => Promise<EmailResult>;
  deleteAction: () => Promise<unknown>;
  labels: DocumentActionsLabels;
}) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sharePending, startShare] = useTransition();
  const [dupPending, startDup] = useTransition();
  const [emailPending, startEmail] = useTransition();
  const [deletePending, startDelete] = useTransition();

  const url =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/${publicPath}/${token}`
      : "";

  function toggleShare() {
    startShare(async () => {
      if (token) {
        await unshareAction();
        setToken(null);
      } else {
        const res = await shareAction();
        if (res?.token) setToken(res.token);
      }
    });
  }
  function duplicate() {
    startDup(async () => {
      await duplicateAction();
    });
  }
  function email() {
    setEmailError(null);
    startEmail(async () => {
      const res = await emailAction();
      if ("ok" in res && res.ok) {
        setSent(true);
        setTimeout(() => setSent(false), 3000);
      } else if ("error" in res) {
        setEmailError(labels.emailErrors[res.error] ?? labels.emailErrors.default ?? "Error");
      }
    });
  }
  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  const tile =
    "flex min-h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2 py-3 text-center text-neutral-700 transition-colors hover:border-neutral-300 hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800";
  const dangerTile =
    "flex min-h-[4.25rem] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2 py-3 text-center text-destructive-text transition-colors hover:border-destructive/40 hover:bg-destructive/5 dark:border-neutral-800 dark:bg-neutral-900";
  const iconCls = "h-5 w-5 text-neutral-500 dark:text-neutral-400";
  const labelCls = "text-[11px] font-medium leading-tight";

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={toggleShare}
          disabled={sharePending}
          className={tile}
          aria-pressed={Boolean(token)}
        >
          {token ? <Link2 className={iconCls} /> : <Share2 className={iconCls} />}
          <span className={labelCls}>{token ? labels.stopSharing : labels.share}</span>
        </button>

        <button type="button" onClick={duplicate} disabled={dupPending} className={tile}>
          <Copy className={iconCls} />
          <span className={labelCls}>{labels.duplicate}</span>
        </button>

        <button
          type="button"
          onClick={email}
          disabled={emailPending || sent}
          className={tile}
        >
          {sent ? (
            <Check className="h-5 w-5 text-success-text" />
          ) : (
            <Mail className={iconCls} />
          )}
          <span className={labelCls}>
            {sent ? labels.emailSent : emailPending ? labels.emailSending : labels.email}
          </span>
        </button>

        <ConfirmDialog
          title={labels.delete}
          description={labels.deleteConfirm}
          confirmLabel={labels.delete}
          trigger={
            <button type="button" disabled={deletePending} className={dangerTile}>
              <Trash2 className="h-5 w-5" />
              <span className={labelCls}>{labels.delete}</span>
            </button>
          }
          onConfirm={() =>
            startDelete(async () => {
              await deleteAction();
            })
          }
        />
      </div>

      {token && (
        <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
            <Input readOnly value={url} className="h-9 flex-1 text-xs" aria-label={labels.copyLink} />
            <Button type="button" variant="outline" size="sm" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? labels.copied : labels.copyLink}
            </Button>
          </div>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">{labels.shareHint}</span>
        </div>
      )}

      {emailError && <p className="text-xs text-destructive-text">{emailError}</p>}
    </div>
  );
}
