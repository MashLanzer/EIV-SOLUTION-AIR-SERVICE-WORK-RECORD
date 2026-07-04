import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function RecordNotFound() {
  return (
    <EmptyState
      icon={FileQuestion}
      title="Record not found"
      description="It may have been deleted, or the link is incorrect."
      action={
        <Button asChild className="mt-2">
          <Link href="/records">
            <ArrowLeft className="h-4 w-4" />
            Back to My Records
          </Link>
        </Button>
      }
    />
  );
}
