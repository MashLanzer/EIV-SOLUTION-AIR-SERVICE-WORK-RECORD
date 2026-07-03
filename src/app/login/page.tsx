import { redirect } from "next/navigation";
import { Wind } from "lucide-react";

import { LoginForm } from "@/components/forms/LoginForm";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { auth } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ passwordChanged?: string }>;
}) {
  const { passwordChanged } = await searchParams;

  const session = await auth();
  if (session?.user) {
    redirect(session.user.mustChangePassword ? "/change-password" : "/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Wind className="h-7 w-7" strokeWidth={2.25} />
          </span>
          <CardTitle className="text-xl">EIV Solution Air</CardTitle>
          <CardDescription>Installation / Service Work Record</CardDescription>
        </CardHeader>
        <CardContent>
          {passwordChanged && (
            <Alert variant="success" className="mb-4">
              Password updated. Please sign in again.
            </Alert>
          )}
          <p className="mb-4 text-center text-sm text-slate-500">
            Enter the username and password your supervisor gave you.
          </p>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
