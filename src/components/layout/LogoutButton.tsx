"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function LogoutButton() {
  return (
    <ConfirmDialog
      title="Sign out?"
      description="You'll need to sign in again to access your account."
      confirmLabel="Sign out"
      trigger={
        <button
          type="button"
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900 active:bg-neutral-100 dark:active:bg-neutral-800"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive-soft text-destructive-text">
            <LogOut className="h-4.5 w-4.5" />
          </span>
          <span className="text-sm font-medium text-destructive-text">
            Sign out
          </span>
        </button>
      }
      onConfirm={() => signOut({ redirectTo: "/login" })}
    />
  );
}
