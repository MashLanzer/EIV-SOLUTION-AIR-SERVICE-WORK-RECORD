import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkerForm } from "@/components/workers/WorkerForm";

export default function NewWorkerPage() {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>New Worker Account</CardTitle>
      </CardHeader>
      <CardContent>
        <WorkerForm />
      </CardContent>
    </Card>
  );
}
