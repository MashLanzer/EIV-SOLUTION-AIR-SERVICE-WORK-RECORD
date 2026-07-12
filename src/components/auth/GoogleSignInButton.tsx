"use client";

import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/i18n/LocaleProvider";

export function GoogleSignInButton() {
  const t = useT();
  const handleClick = async () => {
    // Inside the Android app shell: MainActivity catches this custom-scheme
    // navigation and shows the native Credential Manager account picker
    // (every Google account on the device, not just whichever one Chrome
    // happens to be signed into) - falling back to the browser-based OAuth
    // dance (open-login -> /login?native=1 -> /native-handoff) only if
    // Credential Manager itself isn't available on the device.
    if (window.Capacitor?.isNativePlatform?.()) {
      window.location.href = "eivsolutionair://native-google-signin";
      return;
    }

    const native = new URLSearchParams(window.location.search).get("native");
    await signIn("google", { redirectTo: native ? "/native-handoff" : "/" });
  };

  return (
    <Button
      type="button"
      size="lg"
      className="w-full"
      onClick={handleClick}
    >
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
      {t.auth.signInWithGoogle}
    </Button>
  );
}
