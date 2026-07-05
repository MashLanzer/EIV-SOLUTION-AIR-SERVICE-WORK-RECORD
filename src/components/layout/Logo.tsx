import { Wind } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Wind className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="leading-none">
        EIV Solution Air
      </span>
    </span>
  );
}
