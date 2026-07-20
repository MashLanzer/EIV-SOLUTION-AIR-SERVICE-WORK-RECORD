"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

// A gentle page-level fade on every navigation: keying the wrapper by pathname
// remounts it on route change, re-running the fade-in. Opacity-only (no
// transform) so it never shifts layout, and the reduced-motion guards collapse
// it to instant. Keeps the app feeling continuous instead of hard-cutting.
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-fade-in">
      {children}
    </div>
  );
}
