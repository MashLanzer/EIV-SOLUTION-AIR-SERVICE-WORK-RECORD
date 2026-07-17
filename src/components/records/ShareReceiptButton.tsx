"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Mail, MessageCircle, QrCode, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Select } from "@/components/ui/select";
import { shareRecordAction, unshareRecordAction } from "@/actions/records";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { qrToSvg } from "@/lib/qr";

// Toggle the public customer receipt from the record detail. The trigger is a
// compact action tile; everything else (expiry, link, copy, WhatsApp / email /
// QR / stop-sharing) lives in a bottom sheet so it never clutters the card.
export function ShareReceiptButton({
  recordId,
  initialToken,
  initialExpiresAt = null,
  defaultExpiryDays = null,
  customerPhone = null,
  customerEmail = null,
  className,
}: {
  recordId: string;
  initialToken: string | null;
  initialExpiresAt?: string | null;
  // Company default expiry (Settings → Documents) that pre-selects the picker;
  // null keeps the historical "never" default.
  defaultExpiryDays?: number | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  // Styling for the trigger tile so it matches the surrounding action grid.
  className?: string;
}) {
  const t = useT().receipt;
  const tc = useT().common;
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(initialToken);
  const [expiresAt, setExpiresAt] = useState<string | null>(initialExpiresAt);
  const [expiryDays, setExpiryDays] = useState(String(defaultExpiryDays ?? 0));
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [pending, startTransition] = useTransition();

  const url = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/receipt/${token}`
    : "";
  // Rendered once per URL; QR modules are always dark-on-white for scannability
  // regardless of the app theme.
  const qrSvg = useMemo(
    () => (url ? qrToSvg(url, { pixels: 176, dark: "#0a0a0a", light: "#ffffff" }) : ""),
    [url]
  );
  const message = `${t.shareMessage} ${url}`;
  const phoneDigits = (customerPhone ?? "").replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
  const mailtoUrl = `mailto:${customerEmail ?? ""}?subject=${encodeURIComponent(
    t.emailSubject
  )}&body=${encodeURIComponent(message)}`;

  function share() {
    startTransition(async () => {
      const res = await shareRecordAction(recordId, Number(expiryDays) || null);
      if (res?.token) {
        setToken(res.token);
        setExpiresAt(res.expiresAt);
      }
    });
  }
  function stop() {
    startTransition(async () => {
      await unshareRecordAction(recordId);
      setToken(null);
      setExpiresAt(null);
      setCopied(false);
    });
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked - the link is still selectable in the field */
    }
  }

  const expiryNote = expiresAt
    ? t.expiresOn.replace(
        "{date}",
        new Date(expiresAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      )
    : t.neverExpires;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <span className="relative">
          <Share2 className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
          {token && (
            <span
              className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-success-text ring-2 ring-white dark:ring-neutral-900"
              aria-hidden="true"
            />
          )}
        </span>
        <span className="text-[11px] font-medium leading-tight">{t.share}</span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={t.shareTitle} closeLabel={tc.close}>
        {!token ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.sharingHint}</p>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {t.expiryLabel}
              </span>
              <Select
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                aria-label={t.expiryLabel}
              >
                <option value="0">{t.expiryNever}</option>
                <option value="7">{t.expiry7}</option>
                <option value="30">{t.expiry30}</option>
                {/* The company default may be a value that isn't one of the
                    presets (Settings → Documents) - keep it selectable. */}
                {defaultExpiryDays != null &&
                  ![0, 7, 30].includes(defaultExpiryDays) && (
                    <option value={String(defaultExpiryDays)}>
                      {t.expiryDays.replace("{days}", String(defaultExpiryDays))}
                    </option>
                  )}
              </Select>
            </div>
            <Button type="button" disabled={pending} onClick={share} className="w-full">
              <Share2 className="h-4 w-4" />
              {t.share}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 px-2 py-2 text-xs text-neutral-700 dark:text-neutral-300"
                aria-label={t.shareTitle}
              />
              <Button type="button" variant="outline" size="sm" onClick={copy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t.copied : t.copyLink}
              </Button>
            </div>
            {/* Hand the link straight to the customer. WhatsApp pre-fills the
                chat (their number if we have it); email pre-fills subject + body. */}
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  {t.sendWhatsApp}
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={mailtoUrl}>
                  <Mail className="h-4 w-4" />
                  {t.sendEmail}
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {t.openLink}
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowQr((v) => !v)}
                aria-expanded={showQr}
              >
                <QrCode className="h-4 w-4" />
                {showQr ? t.hideQr : t.showQr}
              </Button>
            </div>
            {showQr && (
              <div className="flex flex-col items-center gap-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white p-3">
                {/* Self-contained inline SVG from our own encoder - no network. */}
                <div
                  className="h-44 w-44"
                  aria-label={t.scanToOpen}
                  role="img"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <span className="text-xs text-neutral-500">{t.scanToOpen}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2 border-t border-neutral-100 dark:border-neutral-800 pt-3">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{expiryNote}</span>
              <button
                type="button"
                disabled={pending}
                onClick={stop}
                className={cn(
                  "flex items-center gap-1.5 text-sm font-medium text-destructive-text transition-opacity hover:opacity-80",
                  pending && "opacity-50"
                )}
              >
                <X className="h-4 w-4" />
                {t.stopSharing}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
