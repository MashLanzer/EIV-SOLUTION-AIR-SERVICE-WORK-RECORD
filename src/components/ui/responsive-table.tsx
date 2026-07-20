import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

// Small, composable building blocks for the "table on desktop, stacked
// cards on mobile" pattern used across the admin Records/Customers/
// Workers/Reports lists - deliberately not one generic config-driven
// table, since each list's row content differs (status badges vs. role
// badges vs. money figures). Pair with `hidden sm:block` on the real
// `<Table>` and `sm:hidden` here (built into MobileCardList).
export function MobileCardList({ children }: { children: ReactNode }) {
  // stagger-children gives the stacked cards a gentle cascading entrance
  // (capped + reduced-motion aware) — one place lights up every admin list.
  return <div className="stagger-children flex flex-col gap-3 sm:hidden">{children}</div>;
}

export function MobileCardRow({
  children,
  actions,
  className,
}: {
  children: ReactNode;
  // Right-aligned action buttons (Edit/PDF/Delete, Manage, View, etc.),
  // shown in a footer row separated from the row's data.
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-3 p-4">
        {children}
        {actions && (
          <div className="flex justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800 pt-3">
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
