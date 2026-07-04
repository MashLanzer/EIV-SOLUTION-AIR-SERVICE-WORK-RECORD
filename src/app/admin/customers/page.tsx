import Link from "next/link";
import { Contact, Search, SearchX, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { pageCount, paginationArgs, parsePage } from "@/lib/paginate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: rawPage } = await searchParams;
  const query = q?.trim() || undefined;
  const page = parsePage(rawPage);

  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { address: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      include: { _count: { select: { records: true } } },
      orderBy: { name: "asc" },
      ...paginationArgs(page),
    }),
  ]);
  const pages = pageCount(total);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Customers</h1>

      <form method="get" className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          name="q"
          placeholder="Search by name or address"
          defaultValue={query}
          className="pl-9"
          aria-label="Search customers"
        />
      </form>

      {customers.length === 0 ? (
        query ? (
          <EmptyState
            icon={SearchX}
            title="No matches"
            description={`Nothing found for "${query}".`}
            action={
              <Button asChild variant="outline" className="mt-2">
                <Link href="/admin/customers">Clear search</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Contact}
            title="No customers yet"
            description="Customers are saved automatically when work records are submitted."
          />
        )
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Jobs</TableHead>
                  <TableHead className="text-right">History</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium text-slate-900">
                      {customer.name}
                    </TableCell>
                    <TableCell>{customer.address}</TableCell>
                    <TableCell>{customer._count.records}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/customers/${customer.id}`}>
                          View
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Pagination
        page={page}
        pageCount={pages}
        basePath="/admin/customers"
        params={{ q: query }}
      />
    </div>
  );
}
