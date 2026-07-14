import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { CreateOrgForm } from "@/components/super/CreateOrgForm";
import { requireSuperAdmin } from "@/lib/superAdmin";

export const dynamic = "force-dynamic";

export default async function NewOrgPage() {
  await requireSuperAdmin();
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <Link
        href="/super/orgs"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Companies
      </Link>
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">New company</h1>
      <Card>
        <CardContent className="p-4">
          <CreateOrgForm />
        </CardContent>
      </Card>
    </div>
  );
}
