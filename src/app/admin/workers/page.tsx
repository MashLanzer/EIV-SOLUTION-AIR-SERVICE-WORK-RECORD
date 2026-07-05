import Link from "next/link";
import { Search, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { WorkersTable } from "@/components/workers/WorkersTable";
import { pageCount, paginationArgs, parsePage } from "@/lib/paginate";
import { prisma } from "@/lib/prisma";
import { parseSort } from "@/lib/sort";
import type { Prisma } from "@prisma/client";

const WORKER_SORTS = ["name", "email", "role", "status"] as const;

function workerOrderBy(
  sort: (typeof WORKER_SORTS)[number],
  dir: "asc" | "desc"
): Prisma.UserOrderByWithRelationInput {
  switch (sort) {
    case "email":
      return { email: dir };
    case "role":
      return { role: dir };
    case "status":
      return { active: dir };
    default:
      return { name: dir };
  }
}

export default async function AdminWorkersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const rawQ = Array.isArray(rawParams.q) ? rawParams.q[0] : rawParams.q;
  const query = rawQ?.trim() || undefined;
  const page = parsePage(rawParams.page);
  const { sort, dir } = parseSort(rawParams.sort, rawParams.dir, WORKER_SORTS, {
    sort: "name",
    dir: "asc",
  });

  const where: Prisma.UserWhereInput | undefined = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      }
    : undefined;

  const [total, workers] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: workerOrderBy(sort, dir),
      ...paginationArgs(page),
    }),
  ]);
  const pages = pageCount(total);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Workers</h1>
        <Button asChild>
          <Link href="/admin/workers/new">
            <UserPlus className="h-4 w-4" />
            New Worker
          </Link>
        </Button>
      </div>

      <form method="get" className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          name="q"
          placeholder="Search by name or email"
          defaultValue={query}
          className="pl-9"
          aria-label="Search workers by name or email"
        />
      </form>

      <Card>
        <CardContent className="p-0">
          <WorkersTable workers={workers} sort={sort} dir={dir} query={query} />
        </CardContent>
      </Card>

      <Pagination
        page={page}
        pageCount={pages}
        basePath="/admin/workers"
        params={{ q: query, sort, dir }}
      />
    </div>
  );
}
