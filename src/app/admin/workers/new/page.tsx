import { Card, CardContent } from "@/components/ui/card";
import { WorkerForm } from "@/components/workers/WorkerForm";
import { requireAdmin } from "@/lib/session";

export default async function NewWorkerPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        New Worker
      </h1>
      <Card className="max-w-md">
        <CardContent className="pt-4">
          <WorkerForm />
        </CardContent>
      </Card>
    </div>
  );
}
