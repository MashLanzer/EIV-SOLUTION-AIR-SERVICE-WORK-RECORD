import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkRecordForm } from "@/components/forms/WorkRecordForm";
import { createRecordAction } from "@/actions/records";
import { requireAuth } from "@/lib/session";

export default async function NewRecordPage() {
  const session = await requireAuth();

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Work Record</CardTitle>
      </CardHeader>
      <CardContent>
        <WorkRecordForm
          action={createRecordAction}
          defaultValues={{ leadInstallerName: session.user.name ?? "" }}
          submitLabel="Submit Record"
        />
      </CardContent>
    </Card>
  );
}
