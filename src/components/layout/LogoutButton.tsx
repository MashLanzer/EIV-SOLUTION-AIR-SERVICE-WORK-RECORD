"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function LogoutButton() {
  return (
    <ConfirmDialog
      title="Sign out?"
      description="You'll need to sign in again to access your account."
      confirmLabel="Sign out"
      trigger={
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3 rounded-none px-6 py-4 text-destructive hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      }
      onConfirm={() => signOut({ redirectTo: "/login" })}
    />
  );
}
