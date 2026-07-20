"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { AeroMark } from "@/components/brand/AeroMark";
import { AeroWordmark } from "@/components/brand/AeroWordmark";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

// The sign-in experience as a small two-step flow (Welcome → Sign in), styled
// with the app's own neutral palette (no coloured gradients) and a subtle
// brand-teal glow. Auth is unchanged: the only real action is Google sign-in.
export function LoginExperience({
  startOnSignIn = false,
  showError = false,
}: {
  startOnSignIn?: boolean;
  // True only for a real "account not authorized" bounce, so the alert shows.
  showError?: boolean;
}) {
  const t = useT().auth;
  const [step, setStep] = useState<"welcome" | "signin">(startOnSignIn ? "signin" : "welcome");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-neutral-50 via-white to-neutral-100 px-5 py-10 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      {/* Soft brand glow — subtle, monochrome-friendly. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full opacity-30 blur-3xl dark:opacity-20"
        style={{ background: "radial-gradient(circle, var(--brand-teal), transparent 70%)" }}
      />

      <div className="relative w-full max-w-sm">
        <div className="rounded-3xl border border-neutral-200/80 bg-white/80 p-7 shadow-xl shadow-black/5 backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-900/70">
          {step === "welcome" ? (
            <div key="welcome" className="flex animate-fade-up flex-col items-center gap-5 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                <AeroMark className="h-12 w-12 text-neutral-900 dark:text-neutral-100" />
              </span>
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {t.welcomeTitle} <span aria-hidden="true">=)</span>
                </h1>
                <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
                  {t.welcomeLead}
                </p>
              </div>
              <Button
                type="button"
                size="lg"
                className="mt-1 w-full"
                onClick={() => setStep("signin")}
              >
                {t.getStarted}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div className="pt-1 text-neutral-400 dark:text-neutral-500">
                <AeroWordmark />
              </div>
            </div>
          ) : (
            <div key="signin" className="flex animate-fade-up flex-col gap-5">
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setStep("welcome")}
                  aria-label={t.back}
                  className="-ml-1 flex items-center gap-1 rounded-lg px-1.5 py-1 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t.back}
                </button>
              </div>

              <div className="flex flex-col items-center gap-3 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                  <AeroMark className="h-8 w-8 text-neutral-900 dark:text-neutral-100" />
                </span>
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                    {t.signInTitle}
                  </h1>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.signInPrompt}</p>
                </div>
              </div>

              {showError && (
                <Alert variant="error" className={cn("text-sm")}>
                  {t.notAuthorized}
                </Alert>
              )}

              <GoogleSignInButton />

              <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">{t.tagline}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
