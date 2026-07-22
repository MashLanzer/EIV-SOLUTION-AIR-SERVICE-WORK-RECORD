"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBackDismiss } from "@/hooks/useBackDismiss";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";
import { sendOrgMessageAction, type MessageActionState } from "@/actions/orgMessage";
import type { OrgMessage } from "@/lib/platform";

const historyFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// Compose a targeted in-app message to a company's people, opened as a bottom
// sheet from the company page. In-app only (no email/push): it lands in each
// recipient's notification bell. Audience is admins-only by default, or everyone.
// Past sends are listed below the form as a history.
export function OrgMessageSheet({
  orgId,
  orgName,
  history = [],
}: {
  orgId: string;
  orgName: string;
  history?: OrgMessage[];
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, action, pending] = useActionState<MessageActionState, FormData>(
    sendOrgMessageAction.bind(null, orgId),
    {}
  );

  useBackDismiss(open, close);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockBodyScroll();
    };
  }, [open]);

  // Clear the fields after a successful send so the sheet is ready to reuse.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Send className="h-4 w-4" />
        Message
      </Button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Message company">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
            <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] animate-fade-up flex-col rounded-t-2xl border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[88vh] sm:max-w-lg sm:rounded-2xl sm:border native:pb-[env(safe-area-inset-bottom)]">
              <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
                <h2 className="min-w-0 truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Message {orgName}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <form ref={formRef} action={action} className="flex flex-col gap-4">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Delivered to their in-app notifications — no email or push. Shown as a message
                    from AeroTrack.
                  </p>

                  <div>
                    <label htmlFor="msg-title" className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
                      Subject
                    </label>
                    <Input id="msg-title" name="title" placeholder="e.g. Scheduled maintenance" required maxLength={120} />
                  </div>

                  <div>
                    <label htmlFor="msg-body" className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400">
                      Message
                    </label>
                    <textarea
                      id="msg-body"
                      name="body"
                      rows={4}
                      maxLength={2000}
                      required
                      placeholder="Write your message…"
                      className="w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                    />
                  </div>

                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">Send to</legend>
                    <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
                      <input type="radio" name="audience" value="admins" defaultChecked className="accent-primary" />
                      Admins only
                    </label>
                    <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
                      <input type="radio" name="audience" value="all" className="accent-primary" />
                      Everyone in the company
                    </label>
                  </fieldset>

                  {state.error && <p className="text-xs text-destructive-text">{state.error}</p>}
                  {state.ok && (
                    <p className="flex items-center gap-1.5 text-xs font-medium text-success-text">
                      <CheckCircle2 className="h-4 w-4" />
                      Sent to {state.sentTo} {state.sentTo === 1 ? "person" : "people"}.
                    </p>
                  )}

                  <div className="flex justify-end">
                    <Button type="submit" disabled={pending}>
                      <Send className="h-4 w-4" />
                      {pending ? "Sending…" : "Send message"}
                    </Button>
                  </div>
                </form>

                {history.length > 0 && (
                  <div className="mt-5 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                      Sent
                    </h3>
                    <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
                      {history.map((m) => (
                        <li key={m.id} className="py-2.5">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{m.title}</p>
                          <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs text-neutral-500 dark:text-neutral-400">
                            {m.body}
                          </p>
                          <p className="mt-1 text-xs text-neutral-400">
                            {historyFmt.format(m.createdAt)} · {m.audience === "admins" ? "Admins" : "Everyone"} ·{" "}
                            {m.recipientCount} {m.recipientCount === 1 ? "recipient" : "recipients"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
