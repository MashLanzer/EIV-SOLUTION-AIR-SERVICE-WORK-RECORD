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
}

export function FormSection({
  icon: Icon,
  title,
  children,
  emphasis = "default",
}: FormSectionProps) {
  return (
    <Card
      className={cn(
        emphasis === "critical" && "border-l-4 border-l-primary shadow-none",
        emphasis === "subtle" && "border-dashed shadow-none"
      )}
    >
      <CardHeader className="flex-row items-center gap-2.5 space-y-0 pb-2">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            emphasis === "subtle"
              ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
              : "bg-accent-soft text-accent"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <CardTitle className={cn(emphasis === "critical" && "font-bold")}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {children}
      </CardContent>
    </Card>
  );
}
