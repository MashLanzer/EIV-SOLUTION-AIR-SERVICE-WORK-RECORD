import { redirect } from "next/navigation";

import { ArrowRight, ShieldCheck } from "lucide-react";

import { AeroMark } from "@/components/brand/AeroMark";
import { AeroWordmark } from "@/components/brand/AeroWordmark";
import { OnboardingForms } from "@/components/onboarding/OnboardingForms";
import { requireAuth } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platformAdmins";
import { getT } from "@/lib/i18n/server";

export default async function OnboardingPage() {
  const session = await requireAuth();
  const t = (await getT()).onboarding;
  // Already in a company - straight to the app.
  if (session.user.organizationId) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/records");
  }

  // Platform admins (env owners or granted from /super) land here with no
  // company, so surface a direct way into the console.
  const showPlatformAccess = await isPlatformAdmin(session.user.email);

  return (
    <div className="min-h-screen bg-background px-4 py-10 native:pt-[calc(2.5rem+env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <AeroMark className="mb-1 h-14 w-14 text-neutral-900 dark:text-neutral-100" />
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            <AeroWordmark />
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {session.user.name
              ? t.welcome.replace("{name}", session.user.name.split(" ")[0])
              : ""}
            {t.pageSubtitle}
          </p>
        </div>

        <OnboardingForms
          account={{
            name: session.user.name ?? null,
            email: session.user.email ?? null,
            image: session.user.image ?? null,
          }}
        />

        {/* Platform owners (email allowlist) have no company to join — this is
            their way straight into /super from the post-login screen, without
            touching the join/create flow everyone else sees. */}
        {showPlatformAccess && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
              <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                {t.platformOwner}
              </span>
              <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            </div>
            <a
              href="/super"
              className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 transition-[border-color,transform] duration-200 ease-[var(--ease-out)] hover:border-neutral-300 active:scale-[0.99] dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {t.platformConsole}
                </span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                  {t.platformConsoleSub}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
