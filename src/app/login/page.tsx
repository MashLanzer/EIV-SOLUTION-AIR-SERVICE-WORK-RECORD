import { redirect } from "next/navigation";

import { AeroMark } from "@/components/brand/AeroMark";
import { AeroWordmark } from "@/components/brand/AeroWordmark";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; native?: string }>;
}) {
  const { error, native } = await searchParams;

  const session = await auth();
  // For the native hand-off we must NOT reuse whatever account the system
  // browser is already signed into: it may be a different account (e.g. an
  // admin from an earlier sign-in) than the one the user is now switching
  // to, and silently reusing it would hand the app the wrong session. Only
  // the plain web flow reuses an existing session; the native flow always
  // falls through to an explicit "Sign in with Google" pick below, which
  // forces Google's account chooser (prompt=select_account).
  if (session?.user && !native) {
    redirect("/");
  }

  const t = (await getT()).auth;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center gap-2 p-6 pb-0 text-center">
          <AeroMark className="mb-1 h-16 w-16 text-neutral-900 dark:text-neutral-100" />
          <CardTitle className="text-2xl">
            <AeroWordmark />
          </CardTitle>
          <CardDescription>{t.tagline}</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {error === "AccessDenied" && (
            <Alert variant="error" className="mb-4">
              {t.notAuthorized}
            </Alert>
          )}
          <p className="mb-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
            {t.signInPrompt}
          </p>
          <GoogleSignInButton />
        </CardContent>
      </Card>
    </div>
  );
}
