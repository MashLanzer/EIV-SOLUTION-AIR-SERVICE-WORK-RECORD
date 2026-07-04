"use client";

import { useEffect } from "react";

const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

// Only does anything inside the Android app shell (mobile/). Listens for the
// eivsolutionair://auth-callback deep link that /native-handoff fires once
// Google Sign-In finishes in the system browser, and installs the resulting
// session token as a cookie in this WebView so the app is authenticated too.
//
// The cookie is written with document.cookie on purpose: the WebView is on
// the site's real https origin, so a plain first-party cookie write works
// without any Capacitor plugin configuration. (It can't be HttpOnly this
// way, but HttpOnly is not required for the server to accept it.)
export function NativeAuthBridge() {
  useEffect(() => {
    const capacitor = window.Capacitor;
    if (!capacitor?.isNativePlatform?.()) return;

    const app = capacitor.Plugins?.App;
    if (!app) return;

    let removeListener: (() => void) | undefined;

    app
      .addListener("appUrlOpen", (event) => {
        const url = new URL(event.url);
        if (url.host !== "auth-callback") return;

        const token = url.searchParams.get("token");
        const cookieName = url.searchParams.get("cookieName");
        if (!token || !cookieName) return;

        document.cookie =
          `${cookieName}=${token}; path=/; max-age=${THIRTY_DAYS_SECONDS}; ` +
          `secure; samesite=lax`;

        // Close the Custom Tab the sign-in happened in, if it's still open.
        capacitor.Plugins?.Browser?.close?.().catch(() => {});

        window.location.href = "/";
      })
      .then((handle) => {
        removeListener = handle.remove;
      });

    return () => removeListener?.();
  }, []);

  return null;
}
