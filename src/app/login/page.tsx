import { redirect } from "next/navigation";

import { LoginForm } from "@/components/forms/LoginForm";
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
        <CardHeader>
          <CardTitle>EIV Solution Air</CardTitle>
          <CardDescription>Installation / Service Work Record</CardDescription>
        </CardHeader>
        <CardContent>
          {passwordChanged && (
            <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              Password updated. Please sign in again.
            </p>
          )}
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
