"use client";

import { useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { LogoutButton } from "@/components/layout/LogoutButton";
import { InviteCodeCard } from "@/components/settings/InviteCodeCard";
import { ResetHistoryDialog } from "@/components/settings/ResetHistoryDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataField } from "@/components/ui/data-field";

// Taps on the Role value needed to reveal the admin-only Danger zone -
// deliberately obscure (like Android's "tap Build number 7 times"), so the
// destructive reset never sits in plain view.
const TAPS_TO_REVEAL = 7;

export function SettingsScreen({
  name,
  email,
  role,
  backHref,
  inviteCode,
}: {
  name: string;
  email: string;
  role: "ADMIN" | "WORKER";
  backHref: string;
  // The company's invite code, shown to admins only.
  inviteCode?: string | null;
}) {
  const isAdmin = role === "ADMIN";
  const tapsRef = useRef(0);
  const [revealed, setRevealed] = useState(false);

  function bumpTaps() {
    if (!isAdmin || revealed) return;
    tapsRef.current += 1;
    if (tapsRef.current >= TAPS_TO_REVEAL) setRevealed(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href={backHref}
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Settings
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <DataField label="Name" value={name} />
          <DataField label="Email" value={email} />
          <DataField
            label="Role"
            value={
              <span
                onClick={bumpTaps}
                className="cursor-default select-none"
              >
                {isAdmin ? "Admin" : "Worker"}
              </span>
            }
          />
        </CardContent>
      </Card>

      {isAdmin && inviteCode !== undefined && (
        <InviteCodeCard code={inviteCode} />
      )}

      <Card>
        <CardContent className="p-0">
          <LogoutButton />
        </CardContent>
      </Card>

      {revealed && isAdmin && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Permanently delete <span className="font-medium">everything in
              your company</span> — records, customers, projects, photos, teams,
              checklists and comments — and hand the app back like new. User
              accounts are kept, so you stay signed in. This can&apos;t be undone.
            </p>
            <ResetHistoryDialog />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
