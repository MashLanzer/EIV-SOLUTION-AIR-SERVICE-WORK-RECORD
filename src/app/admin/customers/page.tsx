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
import { SortHeader } from "@/components/ui/sort-header";
import { DataField } from "@/components/ui/data-field";
import { MobileCardList, MobileCardRow } from "@/components/ui/responsive-table";
import { parseSort } from "@/lib/sort";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import type { Prisma } from "@prisma/client";

const CUSTOMER_SORTS = ["name", "address", "jobs"] as const;

function customerOrderBy(
  sort: (typeof CUSTOMER_SORTS)[number],
  dir: "asc" | "desc"
): Prisma.CustomerOrderByWithRelationInput {
  switch (sort) {
    case "address":
      return { address: dir };
    case "jobs":
      return { records: { _count: dir } };
    default:
      return { name: dir };
  }
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const rawParams = await searchParams;
  const rawQ = Array.isArray(rawParams.q) ? rawParams.q[0] : rawParams.q;
  const query = rawQ?.trim() || undefined;
  const page = parsePage(rawParams.page);
  const { sort, dir } = parseSort(
    rawParams.sort,
    rawParams.dir,
    CUSTOMER_SORTS,
    { sort: "name", dir: "asc" }
  );

  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { address: { contains: query, mode: "insensitive" as const } },
          { phone: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      include: { _count: { select: { records: true } } },
      orderBy: customerOrderBy(sort, dir),
      ...paginationArgs(page),
    }),
  ]);
  const pages = pageCount(total);
  const sortProps = {
    sort,
    dir,
    basePath: "/admin/customers",
    params: { q: query },
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Customers</h1>

      <form method="get" className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
        <Input
          type="search"
          name="q"
          placeholder="Search by name, address, phone, or email"
          defaultValue={query}
          className="pl-9"
          aria-label="Search customers by name, address, phone, or email"
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
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {total} Customer{total === 1 ? "" : "s"}
          </h2>
          <div className="hidden sm:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <SortHeader column="name" label="Name" {...sortProps} />
                      </TableHead>
                      <TableHead>
                        <SortHeader column="address" label="Address" {...sortProps} />
                      </TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>
                        <SortHeader column="jobs" label="Jobs" {...sortProps} />
                      </TableHead>
                      <TableHead className="text-right">History</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                          {customer.name}
                        </TableCell>
                        <TableCell>{customer.address}</TableCell>
                        <TableCell className="text-sm text-neutral-500 dark:text-neutral-400">
                          {customer.phone || customer.email || "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">{customer._count.records}</TableCell>
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
          </div>

          <MobileCardList>
            {customers.map((customer) => (
              <MobileCardRow
                key={customer.id}
                actions={
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/customers/${customer.id}`}>
                      View
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                }
              >
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {customer.name}
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <DataField label="Address" value={customer.address} />
                  <DataField label="Contact" value={customer.phone || customer.email} />
                  <DataField
                    label="Jobs"
                    value={<span className="tabular-nums">{customer._count.records}</span>}
                  />
                </div>
              </MobileCardRow>
            ))}
          </MobileCardList>
        </section>
      )}

      <Pagination
        page={page}
        pageCount={pages}
        basePath="/admin/customers"
        params={{ q: query, sort, dir }}
      />
    </div>
  );
}
