import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-accent-soft text-accent-text",
        secondary: "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300",
        success: "bg-success-soft text-success-text",
        warning: "bg-warning-soft text-warning-text",
        destructive: "bg-destructive-soft text-destructive-text",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge };
