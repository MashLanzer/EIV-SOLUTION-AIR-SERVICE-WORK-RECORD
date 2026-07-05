"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

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
        <CheckCircle2 className="h-4 w-4 text-success-soft" />
        {message}
      </div>
    </div>
  );
}
