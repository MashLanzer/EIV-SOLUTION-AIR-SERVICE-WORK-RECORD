"use client";

import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function GoogleSignInButton() {
  const handleClick = async () => {
    const capacitor = window.Capacitor;

    // Inside the Android app shell: Google blocks sign-in inside an
    // embedded WebView, so open the flow in the system browser instead.
    // It finishes at /native-handoff, which hands the session back to the
    // app via a deep link (see NativeAuthBridge).
    if (capacitor?.isNativePlatform?.()) {
      const url = new URL("/login", window.location.origin);
      url.searchParams.set("native", "1");
      await capacitor.Plugins?.Browser?.open({ url: url.toString() });
      return;
    }

    const native = new URLSearchParams(window.location.search).get("native");
    await signIn("google", { redirectTo: native ? "/native-handoff" : "/" });
  };

  return (
    <Button type="button" size="lg" className="w-full" onClick={handleClick}>
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.93.46 3.76 1.27 5.38z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.1C6.22 6.86 8.87 4.75 12 4.75z"
        />
      </svg>
      Sign in with Google
    </Button>
  );
}
