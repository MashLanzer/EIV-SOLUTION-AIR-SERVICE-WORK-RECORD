import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FormSectionProps {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}

export function FormSection({ icon: Icon, title, children }: FormSectionProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 space-y-0 pb-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon className="h-5 w-5" />
        </span>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {children}
      </CardContent>
    </Card>
  );
}
