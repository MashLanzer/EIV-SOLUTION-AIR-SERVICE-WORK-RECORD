import { useEffect } from "react";

// Warn on a full page unload (reload / closing the app) while `active` is true.
// Used by inline edit forms that have no explicit Cancel button, so unsaved
// edits aren't lost when the app is closed or reloaded. In-app SPA navigation
// isn't covered (the browser gives no hook for it), which is why forms that do
// have a Cancel/leave control also confirm there.
export function useBeforeUnloadGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
}
