import { redirect } from "next/navigation";

import { AeroMark } from "@/components/brand/AeroMark";
import { AeroWordmark } from "@/components/brand/AeroWordmark";
import { OnboardingForms } from "@/components/onboarding/OnboardingForms";
import { requireAuth } from "@/lib/session";

export default async function OnboardingPage() {
  const session = await requireAuth();
  // Already in a company - straight to the app.
  if (session.user.organizationId) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/records");
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 native:pt-[calc(2.5rem+env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <AeroMark className="mb-1 h-14 w-14 text-neutral-900 dark:text-neutral-100" />
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            <AeroWordmark />
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {session.user.name ? `Welcome, ${session.user.name.split(" ")[0]}. ` : ""}
            Join your company with an invite code, or start a new one.
          </p>
        </div>

        <OnboardingForms
          account={{
            name: session.user.name ?? null,
            email: session.user.email ?? null,
            image: session.user.image ?? null,
          }}
        />
      </div>
    </div>
  );
}
