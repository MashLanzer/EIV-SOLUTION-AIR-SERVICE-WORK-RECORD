import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WorkersTable } from "@/components/workers/WorkersTable";
import { prisma } from "@/lib/prisma";

export default async function AdminWorkersPage() {
  const workers = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Workers</h1>
        <Button asChild>
          <Link href="/admin/workers/new">New Worker</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <WorkersTable workers={workers} />
        </CardContent>
      </Card>
    </div>
  );
}
