import { KeyRound } from "lucide-react";

import { ChangePasswordForm } from "@/components/forms/ChangePasswordForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requireAuth } from "@/lib/session";

export default async function ChangePasswordPage() {
  await requireAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <KeyRound className="h-7 w-7" strokeWidth={2.25} />
          </span>
          <CardTitle className="text-xl">Set a new password</CardTitle>
          <CardDescription>
            You&apos;re using a temporary password. Choose a new one now — you
            won&apos;t be asked again after this.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
