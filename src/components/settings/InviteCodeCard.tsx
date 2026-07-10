"use client";

import { useState, useTransition } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { rotateJoinCodeAction } from "@/actions/organization";

export function InviteCodeCard({ code }: { code: string | null }) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

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
    <Card>
      <CardHeader>
        <CardTitle>Team invite code</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Share this code so someone can join your company. They sign in with
          Google and enter it. Rotate it to revoke the old one.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-lg font-semibold tracking-widest tabular-nums text-neutral-900 dark:text-neutral-100">
            {code ?? "—"}
          </code>
          <Button type="button" variant="outline" size="icon" onClick={copy} aria-label="Copy code" disabled={!code}>
            {copied ? <Check className="h-4 w-4 text-success-text" /> : <Copy className="h-4 w-4" />}
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
      </CardContent>
    </Card>
  );
}
