"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Building2, LogOut, Ticket } from "lucide-react";
import { signOut } from "next-auth/react";

import { Alert } from "@/components/ui/alert";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createOrganizationAction,
  joinOrganizationAction,
  type OnboardingState,
} from "@/actions/onboarding";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

interface Account {
  name: string | null;
  email: string | null;
  image: string | null;
}

type Mode = "join" | "create";

export function OnboardingForms({ account }: { account: Account }) {
  const t = useT().onboarding;
  const [mode, setMode] = useState<Mode>("join");
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
      {/* Which Google account is being onboarded - so someone with several
          accounts can confirm they're on the right one before joining. */}
      <Card className="animate-fade-up">
        <CardContent className="flex items-center gap-3 p-3">
          {account.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.image}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <AvatarInitials name={account.name ?? account.email ?? "?"} className="h-9 w-9" />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {account.name ?? t.signedIn}
            </div>
            {account.email && (
              <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                {account.email}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => signOut({ redirectTo: "/login" })}
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-neutral-500 hover:text-primary dark:text-neutral-400"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t.notYou}
          </button>
        </CardContent>
      </Card>

      {/* Segmented switch between the two paths */}
      <div
        role="tablist"
        className="grid grid-cols-2 gap-1 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900 p-1"
      >
        {(["join", "create"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              mode === m
                ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
            )}
          >
            {m === "join" ? <Ticket className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
            {m === "join" ? t.join : t.create}
          </button>
        ))}
      </div>

      {mode === "join" ? (
        <Card className="animate-fade-up">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Ticket className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {t.joinTitle}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t.joinSubtitle}
                </p>
              </div>
            </div>
            <form action={joinAction} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="code">{t.inviteCode}</Label>
                <Input
                  id="code"
                  name="code"
                  required
                  autoCapitalize="characters"
                  autoComplete="off"
                  placeholder={t.inviteCodePlaceholder}
                  className="text-center text-lg uppercase tracking-[0.3em]"
                />
              </div>
              {joinState?.error && <Alert variant="error">{joinState.error}</Alert>}
              <Button type="submit" size="lg" disabled={joining}>
                {joining ? t.joining : t.joinCompany}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="animate-fade-up">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Building2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {t.createTitle}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {t.createSubtitle}
                </p>
              </div>
            </div>
            <form action={createAction} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">{t.companyName}</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  autoComplete="organization"
                  placeholder={t.companyNamePlaceholder}
                />
              </div>
              {createState?.error && (
                <Alert variant="error">{createState.error}</Alert>
              )}
              <Button type="submit" size="lg" disabled={creating}>
                {creating ? t.creating : t.createCompany}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
