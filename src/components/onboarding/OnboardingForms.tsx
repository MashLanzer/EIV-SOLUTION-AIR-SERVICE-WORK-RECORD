"use client";

import { useActionState } from "react";
import { ArrowRight, Building2, LogOut, Ticket } from "lucide-react";
import { signOut } from "next-auth/react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOrganizationAction,
  joinOrganizationAction,
  type OnboardingState,
} from "@/actions/onboarding";

export function OnboardingForms() {
  const [createState, createAction, creating] = useActionState<
    OnboardingState,
    FormData
  >(createOrganizationAction, undefined);
  const [joinState, joinAction, joining] = useActionState<
    OnboardingState,
    FormData
  >(joinOrganizationAction, undefined);

  return (
    <div className="flex flex-col gap-4">
      {/* Join with a code */}
      <Card className="animate-fade-up">
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Ticket className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Join your company
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Enter the invite code they gave you.
              </p>
            </div>
          </div>
          <form action={joinAction} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">Invite code</Label>
              <Input
                id="code"
                name="code"
                required
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="e.g. ABCD2345"
                className="uppercase tracking-widest"
              />
            </div>
            {joinState?.error && <Alert variant="error">{joinState.error}</Alert>}
            <Button type="submit" disabled={joining}>
              {joining ? "Joining..." : "Join company"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        or
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>

      {/* Create a new company */}
      <Card
        className="animate-fade-up"
        style={{ animationDelay: "40ms", animationFillMode: "both" }}
      >
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Start a new company
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                You&apos;ll be its first admin.
              </p>
            </div>
          </div>
          <form action={createAction} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Company name</Label>
              <Input
                id="name"
                name="name"
                required
                autoComplete="organization"
                placeholder="e.g. EIV Solution Air"
              />
            </div>
            {createState?.error && (
              <Alert variant="error">{createState.error}</Alert>
            )}
            <Button type="submit" variant="outline" disabled={creating}>
              {creating ? "Creating..." : "Create company"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <button
        type="button"
        onClick={() => signOut({ redirectTo: "/login" })}
        className="mx-auto mt-2 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary dark:text-neutral-400"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}
