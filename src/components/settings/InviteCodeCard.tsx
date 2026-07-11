"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import {
  SettingsCustomRow,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/SettingsList";
import {
  rotateJoinCodeAction,
  setJoinCodeEnabledAction,
} from "@/actions/organization";

export function InviteCodeCard({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const enabled = code != null;

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (e.g. insecure context) - the code is still visible.
    }
  }

  return (
    <SettingsSection
      title="Team invite code"
      description={
        enabled
          ? "Share this code so someone can join your company. They sign in with Google and enter it."
          : "Joining by code is off. No one can join with a code until you turn this on."
      }
    >
      <SettingsRow
        icon={KeyRound}
        label="Allow joining by code"
        sublabel={enabled ? "On" : "Off"}
        trailing={
          <Switch
            checked={enabled}
            disabled={pending}
            onCheckedChange={(next) =>
              startTransition(() => setJoinCodeEnabledAction(next))
            }
            aria-label="Allow joining by code"
          />
        }
      />

      {enabled && (
        <SettingsCustomRow className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-lg font-semibold tracking-widest tabular-nums text-neutral-900 dark:text-neutral-100">
              {code}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={copy}
              aria-label="Copy code"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success-text" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <ConfirmDialog
            title="Rotate invite code?"
            description="The current code stops working immediately. Anyone you shared it with will need the new one."
            confirmLabel="Rotate code"
            trigger={
              <Button type="button" variant="outline" size="sm" disabled={pending}>
                <RefreshCw className="h-4 w-4" />
                {pending ? "Rotating..." : "Rotate code"}
              </Button>
            }
            onConfirm={() => startTransition(() => rotateJoinCodeAction())}
          />
        </SettingsCustomRow>
      )}
    </SettingsSection>
  );
}
