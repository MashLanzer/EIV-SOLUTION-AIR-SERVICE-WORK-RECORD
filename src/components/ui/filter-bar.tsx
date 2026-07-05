import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Shared "GET form of filter controls" shell used by the admin Records
// and Reports filter bars - a grid on desktop that collapses to 2 columns
// on mobile, with fields spanning the full width via `full`.
export function FilterBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <form method="GET" className={cn("grid grid-cols-2 gap-3 sm:grid-cols-6", className)}>
      {children}
    </form>
  );
}

export function FilterField({
  label,
  htmlFor,
  children,
  full,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-1", full && "col-span-2 sm:col-span-6")}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function FilterActions({ children }: { children: ReactNode }) {
  return (
    <div className="col-span-2 flex items-end gap-2 sm:col-span-6">{children}</div>
  );
}
