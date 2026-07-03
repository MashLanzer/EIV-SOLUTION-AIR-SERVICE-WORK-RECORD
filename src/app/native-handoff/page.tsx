import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { encode } from "next-auth/jwt";

import { auth } from "@/lib/auth";

const THIRTY_DAYS = 30 * 24 * 60 * 60;

// Reached inside the system browser (Custom Tab) right after Google Sign-In
// completes there. The Android WebView the app itself runs in can't do
// Google Sign-In directly (Google blocks it), so the flow finishes here and
// hands the resulting session off to the native app via a deep link. The
// app reads the token from the link and writes it into its own WebView's
// cookie jar (see src/components/native/NativeAuthBridge.tsx).
export default async function NativeHandoffPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const proto = (await headers()).get("x-forwarded-proto");
  const cookieName =
    proto === "https" ? "__Secure-authjs.session-token" : "authjs.session-token";

  const token = await encode({
    token: {
      id: session.user.id,
      role: session.user.role,
      name: session.user.name,
      email: session.user.email,
      sub: session.user.id,
    },
    secret: process.env.AUTH_SECRET!,
    salt: cookieName,
    maxAge: THIRTY_DAYS,
  });

  const params = new URLSearchParams({ token, cookieName });
  redirect(`eivsolutionair://auth-callback?${params.toString()}`);
}
