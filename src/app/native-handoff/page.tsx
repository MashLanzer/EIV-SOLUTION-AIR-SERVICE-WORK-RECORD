import { redirect } from "next/navigation";

import { ReturnToApp } from "./ReturnToApp";

import { auth } from "@/lib/auth";
import { createNativeHandoffCode, mintNativeSessionToken } from "@/lib/nativeHandoff";

// Reached inside the system browser (Custom Tab) right after Google Sign-In
// completes there. The Android WebView the app itself runs in can't complete
// Google's OAuth flow (its PKCE cookie check fails there), so the flow
// finishes here and hands the resulting session off to the native app via
// an eivsolutionair:// deep link. Rather than putting the session token
// straight into that link - custom URL schemes can be claimed by other
// installed apps, and the link can linger in system/browser logs - we mint a
// single-use code that's only good for a few seconds and let the app
// exchange it for the token over HTTPS (see /api/native-handoff/exchange).
export default async function NativeHandoffPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { token, cookieName } = await mintNativeSessionToken(session.user);
  const code = await createNativeHandoffCode(token, cookieName);
  const deepLink = `eivsolutionair://auth-callback?code=${code}`;

  // Rendered (not a server redirect) because browsers may refuse an
  // automatic redirect to a custom app scheme without a user gesture —
  // ReturnToApp auto-attempts it and falls back to a tappable button.
  return <ReturnToApp deepLink={deepLink} />;
}
