import { redirect } from "next/navigation";
import { Wind } from "lucide-react";

import { OnboardingForms } from "@/components/onboarding/OnboardingForms";
import { requireAuth } from "@/lib/session";

export default async function OnboardingPage() {
  const session = await requireAuth();
  // Already in a company - straight to the app.
  if (session.user.organizationId) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/records");
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="mb-1 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wind className="h-7 w-7" strokeWidth={2.25} />
          </span>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Welcome{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Join your company with an invite code, or start a new one.
          </p>
        </div>

        <OnboardingForms />
      </div>
    </div>
  );
}
