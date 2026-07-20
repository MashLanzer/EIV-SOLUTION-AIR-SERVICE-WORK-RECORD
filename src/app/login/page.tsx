import { redirect } from "next/navigation";

import { LoginExperience } from "@/components/auth/LoginExperience";
import { auth } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; native?: string }>;
}) {
  const { error, native } = await searchParams;

  const session = await auth();
  // For the native hand-off we must NOT reuse whatever account the system
  // browser is already signed into: it may be a different account than the one
  // the user is now switching to, and silently reusing it would hand the app
  // the wrong session. Only the plain web flow reuses an existing session; the
  // native flow always falls through to an explicit "Sign in with Google" pick.
  if (session?.user && !native) {
    redirect("/");
  }

  const showError = error === "AccessDenied";
  // Land straight on the sign-in step when there's an error to show, or when
  // the native app bounced back here for an explicit account pick.
  const startOnSignIn = showError || Boolean(native);

  return <LoginExperience startOnSignIn={startOnSignIn} showError={showError} />;
}
