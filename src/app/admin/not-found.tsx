import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getT } from "@/lib/i18n/server";

export default async function AdminNotFound() {
  const t = (await getT()).errors;
  return (
    <EmptyState
      icon={FileQuestion}
      title={t.notFound}
      description={t.notFoundDesc}
      action={
        <Button asChild className="mt-2">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" />
            {t.backToDashboard}
          </Link>
        </Button>
      }
    />
  );
}
