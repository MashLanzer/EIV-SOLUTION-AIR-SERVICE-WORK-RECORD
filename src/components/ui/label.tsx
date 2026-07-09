import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { required?: boolean }) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "text-sm font-medium leading-none text-neutral-700 dark:text-neutral-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <>
          <span aria-hidden="true" className="ml-0.5 text-destructive">
            *
          </span>
          <span className="sr-only"> (required)</span>
        </>
      )}
    </LabelPrimitive.Root>
  );
}

export { Label };
