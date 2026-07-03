import { ChangePasswordForm } from "@/components/forms/ChangePasswordForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { requireAuth } from "@/lib/session";

export default async function ChangePasswordPage() {
  await requireAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Change your password</CardTitle>
          <CardDescription>
            For security, choose a new password before continuing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
