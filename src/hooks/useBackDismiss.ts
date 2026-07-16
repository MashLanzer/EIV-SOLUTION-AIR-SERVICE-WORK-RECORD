import { useEffect, useRef } from "react";

// Make the browser / Android system back button dismiss an open overlay
// (fullscreen photo zoom, bottom sheet, dialog) instead of navigating away or
// leaving it stuck. While `open` is true we push one history entry; a back
// press pops it and fires `popstate`, which closes the overlay. Closing through
// the UI (button / backdrop) consumes that entry so a later back press isn't
// wasted. Without this, the system back button on native leaves the overlay
// pinned on screen and the app looks frozen.
export function useBackDismiss(open: boolean, onClose: () => void) {
  // Keep the latest onClose without re-running the effect (which would push a
  // new history entry on every render).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;

    window.history.pushState({ __overlay: true }, "");
    let poppedByBack = false;

    const onPop = () => {
      poppedByBack = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      // Closed some other way (UI control or unmount) while our entry is still
      // current: pop it so back stays in sync and doesn't need an extra press.
      if (!poppedByBack && window.history.state?.__overlay) {
        window.history.back();
      }
    };
  }, [open]);
}
