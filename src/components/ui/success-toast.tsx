"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

// A checkmark that draws itself in — the small "well done" moment on a
// successful save. Pure SVG; the reduced-motion guards make it appear instant.
function DrawnCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="var(--color-success)" opacity="0.9" />
      <path
        d="M7.5 12.5 L10.7 15.7 L16.5 9"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="check-draw"
      />
    </svg>
  );
}

// Small self-dismissing confirmation shown after a save redirect
// (?saved=1). Cleans the query param from the URL so a refresh or
// back-navigation doesn't re-show it.
export function SuccessToast({
  message,
  aboveMobileNav = false,
}: {
  message: string;
  // Set on pages under the admin section, whose mobile bottom tab bar
  // would otherwise sit under (or behind) this toast.
  aboveMobileNav?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    router.replace(pathname, { scroll: false });
    const timer = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(timer);
  }, [router, pathname]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className={cn(
        "fixed inset-x-0 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4",
        aboveMobileNav && "bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(1.25rem+env(safe-area-inset-bottom))]"
      )}
    >
      <div className="flex animate-fade-up items-center gap-2 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        <DrawnCheck />
        {message}
      </div>
    </div>
  );
}
