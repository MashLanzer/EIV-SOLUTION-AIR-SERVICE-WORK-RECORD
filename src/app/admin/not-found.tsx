import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminNotFound() {
  return (
    <EmptyState
      icon={FileQuestion}
      title="Not found"
      description="This item may have been deleted, or the link is incorrect."
      action={
        <Button asChild className="mt-2">
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
      }
    />
  );
}
