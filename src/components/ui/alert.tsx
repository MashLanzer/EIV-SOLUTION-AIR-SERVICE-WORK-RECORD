import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "flex items-start gap-2 rounded-md p-3 text-sm",
  {
    variants: {
      variant: {
        error: "bg-destructive-soft text-destructive-text",
        success: "bg-success-soft text-success-text",
        info: "bg-accent-soft text-accent-text",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

const ICONS = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
} as const;

interface AlertProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof alertVariants> {}

export function Alert({ className, variant, children, ...props }: AlertProps) {
  const Icon = ICONS[variant ?? "info"];
  return (
    <div className={cn(alertVariants({ variant }), className)} role="alert" {...props}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
