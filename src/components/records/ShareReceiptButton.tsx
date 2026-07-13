"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Mail, MessageCircle, QrCode, Share2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { shareRecordAction, unshareRecordAction } from "@/actions/records";
import { useT } from "@/components/i18n/LocaleProvider";
import { qrToSvg } from "@/lib/qr";

// Toggle the public customer receipt from the record detail. When shared, shows
// the link with copy / open / stop-sharing controls, an optional expiry, and
// one-tap WhatsApp / email hand-off to the customer.
export function ShareReceiptButton({
  recordId,
  initialToken,
  initialExpiresAt = null,
  customerPhone = null,
  customerEmail = null,
}: {
  recordId: string;
  initialToken: string | null;
  initialExpiresAt?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
}) {
  const t = useT().receipt;
  const [token, setToken] = useState(initialToken);
  const [expiresAt, setExpiresAt] = useState<string | null>(initialExpiresAt);
  const [expiryDays, setExpiryDays] = useState("0");
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

  if (!token) {
    return (
      <div className="flex items-center gap-2">
        <Select
          value={expiryDays}
          onChange={(e) => setExpiryDays(e.target.value)}
          aria-label={t.expiryLabel}
          className="h-9 sm:max-w-[9rem]"
        >
          <option value="0">{t.expiryNever}</option>
          <option value="7">{t.expiry7}</option>
          <option value="30">{t.expiry30}</option>
        </Select>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={share}>
          <Share2 className="h-4 w-4" />
          {t.share}
        </Button>
      </div>
    );
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
    <div className="flex w-full flex-col gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 p-3">
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-xs text-neutral-700 dark:text-neutral-300"
          aria-label={t.shareTitle}
        />
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? t.copied : t.copyLink}
        </Button>
      </div>
      {/* Hand the link straight to the customer. WhatsApp pre-fills the chat
          (their number if we have it); email pre-fills subject + body. */}
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-3.5 w-3.5" />
            {t.sendWhatsApp}
          </a>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <a href={mailtoUrl}>
            <Mail className="h-3.5 w-3.5" />
            {t.sendEmail}
          </a>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            {t.openLink}
          </a>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowQr((v) => !v)}
          aria-expanded={showQr}
        >
          <QrCode className="h-3.5 w-3.5" />
          {showQr ? t.hideQr : t.showQr}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={stop}
          className="text-destructive-text"
        >
          <X className="h-3.5 w-3.5" />
          {t.stopSharing}
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
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        {t.sharingHint} · {expiryNote}
      </p>
    </div>
  );
}
