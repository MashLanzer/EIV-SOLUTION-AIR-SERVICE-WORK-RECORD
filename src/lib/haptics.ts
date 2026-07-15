// Light tactile feedback for taps inside the native shell (the APK). Uses the
// Web Vibration API, which the Android WebView maps to the system vibrator —
// this needs the VIBRATE permission in the APK manifest to actually fire. It
// no-ops in a normal browser and wherever the API or permission is absent, so
// it degrades gracefully: the web build is unaffected, and the buzz starts
// working once the APK is rebuilt with the permission.
function isNativeShell(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.hasAttribute("data-native");
}

// A short buzz on tap. Slightly longer for primary actions (the FAB) than for
// plain navigation, so the two feel distinct under the thumb.
export function tapHaptic(durationMs = 8): void {
  if (!isNativeShell()) return;
  try {
    navigator.vibrate?.(durationMs);
  } catch {
    // Vibration unsupported or blocked by the platform — ignore.
  }
}
