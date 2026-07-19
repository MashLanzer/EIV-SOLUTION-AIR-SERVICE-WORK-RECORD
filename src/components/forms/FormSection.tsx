import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
  // Every section rendered identically gave "Job Details" the same visual
  // weight as "Signatures" (a legally required action) or an optional
  // "Photos" section - this lets a section signal how much it matters.
  emphasis?: "default" | "critical" | "subtle";
  // Drop the icon + title header. Used by the step wizard, where the sticky
  // stepper already names the current step, so the in-card title would just
  // repeat it (and eat vertical space). The emphasis border still shows.
  hideHeader?: boolean;
  // Passthrough so callers can stagger an entrance animation per section.
  className?: string;
  style?: React.CSSProperties;
}

export function FormSection({
  icon: Icon,
  title,
  children,
  emphasis = "default",
  hideHeader = false,
  className,
  style,
}: FormSectionProps) {
  return (
    <Card
      style={style}
      className={cn(
        emphasis === "critical" && "border-l-4 border-l-primary shadow-none",
        emphasis === "subtle" && "border-dashed shadow-none",
        className
      )}
    >
      {!hideHeader && (
        <CardHeader className="flex-row items-center gap-2.5 space-y-0 pb-2">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
              emphasis === "subtle"
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <CardTitle className={cn(emphasis === "critical" && "font-bold")}>
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent
        className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", hideHeader && "pt-4")}
      >
        {children}
      </CardContent>
    </Card>
  );
}
