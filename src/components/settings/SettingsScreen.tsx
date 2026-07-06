import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { LogoutButton } from "@/components/layout/LogoutButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataField } from "@/components/ui/data-field";

export function SettingsScreen({
  name,
  email,
  role,
  backHref,
}: {
  name: string;
  email: string;
  role: "ADMIN" | "WORKER";
  backHref: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href={backHref}
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Settings
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <DataField label="Name" value={name} />
          <DataField label="Email" value={email} />
          <DataField label="Role" value={role === "ADMIN" ? "Admin" : "Worker"} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <LogoutButton />
        </CardContent>
      </Card>
    </div>
  );
}
