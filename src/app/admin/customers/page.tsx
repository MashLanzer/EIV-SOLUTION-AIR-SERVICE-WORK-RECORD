import Link from "next/link";
import { ChevronRight, Contact, Search, SearchX, ArrowRight, MapPin, Mail, Phone } from "lucide-react";

import { AvatarInitials } from "@/components/ui/avatar-initials";
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
import { MobileCardList } from "@/components/ui/responsive-table";
import { parseSort } from "@/lib/sort";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
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
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
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

  const where = {
    organizationId,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { address: { contains: query, mode: "insensitive" as const } },
            { phone: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

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
  const dict = await getT();
  const t = dict.customers;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">{t.title}</h1>

      <form method="get" className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
        <Input
          type="search"
          name="q"
          placeholder={t.searchPlaceholder}
          defaultValue={query}
          className="pl-9"
          aria-label={t.searchAria}
        />
      </form>

      {customers.length === 0 ? (
        query ? (
          <EmptyState
            icon={SearchX}
            title={t.noMatches}
            description={t.nothingFound.replace("{q}", query)}
            action={
              <Button asChild variant="outline" className="mt-2">
                <Link href="/admin/customers">{t.clearSearch}</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Contact}
            title={t.noCustomers}
            description={t.noCustomersDesc}
          />
        )
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {(total === 1 ? t.countOne : t.countMany).replace("{n}", String(total))}
          </h2>
          <div className="hidden sm:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <SortHeader column="name" label={t.colName} {...sortProps} />
                      </TableHead>
                      <TableHead>
                        <SortHeader column="address" label={t.colAddress} {...sortProps} />
                      </TableHead>
                      <TableHead>{t.colContact}</TableHead>
                      <TableHead>
                        <SortHeader column="jobs" label={t.colJobs} {...sortProps} />
                      </TableHead>
                      <TableHead className="text-right">{t.colHistory}</TableHead>
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
                          {customer.phone || customer.email ? (
                            <div className="flex flex-col gap-0.5">
                              {customer.phone && (
                                <a
                                  href={`tel:${customer.phone}`}
                                  className="flex w-fit items-center gap-1.5 hover:text-primary"
                                >
                                  <Phone className="h-3.5 w-3.5 shrink-0" />
                                  {customer.phone}
                                </a>
                              )}
                              {customer.email && (
                                <a
                                  href={`mailto:${customer.email}`}
                                  className="flex w-fit items-center gap-1.5 hover:text-primary"
                                >
                                  <Mail className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{customer.email}</span>
                                </a>
                              )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="tabular-nums">{customer._count.records}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/customers/${customer.id}`}>
                              {dict.common.view}
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
              <Card key={customer.id}>
                <Link
                  href={`/admin/customers/${customer.id}`}
                  className="flex items-start gap-3 p-4 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
                >
                  <AvatarInitials name={customer.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                        {customer.name}
                      </span>
                      <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                        {(customer._count.records === 1 ? t.jobCountOne : t.jobCountMany).replace("{n}", String(customer._count.records))}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-start gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span className="min-w-0">{customer.address}</span>
                    </div>
                    {(customer.phone || customer.email) && (
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </span>
                        )}
                        {customer.email && (
                          <span className="flex min-w-0 items-center gap-1">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                </Link>
              </Card>
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
