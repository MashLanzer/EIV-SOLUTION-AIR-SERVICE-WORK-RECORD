"use client";

import { useEffect } from "react";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Only does anything inside the Android app shell (mobile/). Listens for the
// eivsolutionair://auth-callback deep link that /native-handoff redirects to
// once Google Sign-In finishes in the system browser, and installs the
// resulting session token as a cookie in this WebView so the app is
// authenticated too.
export function NativeAuthBridge() {
  useEffect(() => {
    const capacitor = window.Capacitor;
    if (!capacitor?.isNativePlatform?.()) return;

    const app = capacitor.Plugins?.App;
    const cookies = capacitor.Plugins?.CapacitorCookies;
    if (!app || !cookies) return;

    let removeListener: (() => void) | undefined;

    app
      .addListener("appUrlOpen", async (event) => {
        const url = new URL(event.url);
        if (url.host !== "auth-callback") return;

        const token = url.searchParams.get("token");
        const cookieName = url.searchParams.get("cookieName");
        if (!token || !cookieName) return;

        await cookies.setCookie({
          url: window.location.origin,
          key: cookieName,
          value: token,
          path: "/",
          expires: new Date(Date.now() + THIRTY_DAYS_MS).toUTCString(),
        });

        window.location.href = "/";
      })
      .then((handle) => {
        removeListener = handle.remove;
      });

    return () => removeListener?.();
  }, []);

  return null;
}
