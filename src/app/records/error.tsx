"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function RecordsError({ reset }: { reset: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      title="Something went wrong"
      description="We couldn't load this page. Check your connection and try again."
      action={
        <Button className="mt-2" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      }
    />
  );
}
