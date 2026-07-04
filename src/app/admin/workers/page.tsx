import Link from "next/link";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { WorkersTable } from "@/components/workers/WorkersTable";
import { pageCount, paginationArgs, parsePage } from "@/lib/paginate";
import { prisma } from "@/lib/prisma";

export default async function AdminWorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: rawPage } = await searchParams;
  const page = parsePage(rawPage);

  const [total, workers] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      ...paginationArgs(page),
    }),
  ]);
  const pages = pageCount(total);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Workers</h1>
        <Button asChild>
          <Link href="/admin/workers/new">
            <UserPlus className="h-4 w-4" />
            New Worker
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <WorkersTable workers={workers} />
        </CardContent>
      </Card>

      <Pagination page={page} pageCount={pages} basePath="/admin/workers" />
    </div>
  );
}
