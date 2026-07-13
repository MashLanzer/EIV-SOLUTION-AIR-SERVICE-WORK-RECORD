"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/components/i18n/LocaleProvider";

export default function RecordsError({ reset }: { reset: () => void }) {
  const t = useT().errors;
  return (
    <EmptyState
      icon={AlertTriangle}
      title={t.somethingWrong}
      description={t.loadFailed}
      action={
        <Button className="mt-2" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          {t.tryAgain}
        </Button>
      }
    />
  );
}
