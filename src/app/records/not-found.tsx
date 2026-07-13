import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getT } from "@/lib/i18n/server";

export default async function RecordNotFound() {
  const t = (await getT()).errors;
  return (
    <EmptyState
      icon={FileQuestion}
      title={t.recordNotFound}
      description={t.recordNotFoundDesc}
      action={
        <Button asChild className="mt-2">
          <Link href="/records">
            <ArrowLeft className="h-4 w-4" />
            {t.backToRecords}
          </Link>
        </Button>
      }
    />
  );
}
