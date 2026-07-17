import Link from "next/link";
import { Contact, Search, SearchX, ArrowRight, Mail, Phone, Sheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
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
import { PageHeader } from "@/components/ui/page-header";
import { NewCustomerButton } from "@/components/customers/NewCustomerButton";
import { CustomerCards } from "@/components/customers/CustomerCards";
import { parseSort } from "@/lib/sort";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import {
  customerFilterWhere,
  customerSearchWhere,
  normalizeCustomerFilter,
  type CustomerFilter,
} from "@/lib/customerFilters";
import { startOfUtcDay } from "@/lib/schedule";
import { getLocale, getT } from "@/lib/i18n/server";
import type { Prisma } from "@prisma/client";

const CUSTOMER_SORTS = ["name", "address", "jobs"] as const;

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

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
  const session = await requirePermission("customers.manage");
  const organizationId = requireOrgId(session);
  const rawParams = await searchParams;
  const rawQ = Array.isArray(rawParams.q) ? rawParams.q[0] : rawParams.q;
  const query = rawQ?.trim() || undefined;
  const rawFilter = Array.isArray(rawParams.filter) ? rawParams.filter[0] : rawParams.filter;
  const filter = normalizeCustomerFilter(rawFilter);
  const page = parsePage(rawParams.page);
  const { sort, dir } = parseSort(
    rawParams.sort,
    rawParams.dir,
    CUSTOMER_SORTS,
    { sort: "name", dir: "asc" }
  );

  const today = startOfUtcDay(new Date());
  const searchWhere = customerSearchWhere(query);
  const where: Prisma.CustomerWhereInput = {
    organizationId,
    ...searchWhere,
    ...customerFilterWhere(filter, today),
  };
  // Chip counts honor the search term but not the active filter, so each chip
  // shows how many it would land on (mirrors the records list chips).
  const searchScoped: Prisma.CustomerWhereInput = { organizationId, ...searchWhere };

  const [total, customers, allCount, upcomingCount, noContactCount] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      include: {
        _count: { select: { records: true } },
        // Most recent job date = last visit, for the at-a-glance column.
        records: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
      },
      orderBy: customerOrderBy(sort, dir),
      ...paginationArgs(page),
    }),
    prisma.customer.count({ where: searchScoped }),
    prisma.customer.count({
      where: { ...searchScoped, ...customerFilterWhere("upcoming", today) },
    }),
    prisma.customer.count({
      where: { ...searchScoped, ...customerFilterWhere("nocontact", today) },
    }),
  ]);
  const pages = pageCount(total);
  const sortProps = {
    sort,
    dir,
    basePath: "/admin/customers",
    params: { q: query, filter },
  };
  const dict = await getT();
  const t = dict.customers;
  const locale = await getLocale();

  // Serialized rows for the mobile peek-sheet cards (client component).
  const customerPeeks = customers.map((c) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    phone: c.phone,
    email: c.email,
    jobCount: c._count.records,
    jobCountLabel: (c._count.records === 1 ? t.jobCountOne : t.jobCountMany).replace(
      "{n}",
      String(c._count.records)
    ),
    lastVisitLabel: c.records[0] ? formatDate(c.records[0].date, locale) : null,
  }));

  // Quick filter chips, keeping any active search term.
  const filterChips: { label: string; value?: CustomerFilter; count: number }[] = [
    { label: t.filterAll, count: allCount },
    { label: t.filterUpcoming, value: "upcoming", count: upcomingCount },
    { label: t.filterNoContact, value: "nocontact", count: noContactCount },
  ];
  function chipHref(next?: CustomerFilter) {
    const p = new URLSearchParams();
    if (query) p.set("q", query);
    if (next) p.set("filter", next);
    const qs = p.toString();
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  }
  const exportParams = new URLSearchParams();
  if (query) exportParams.set("q", query);
  if (filter) exportParams.set("filter", filter);
  const exportHref = `/admin/customers/export${
    exportParams.toString() ? `?${exportParams.toString()}` : ""
  }`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t.title}
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={exportHref}>
                <Sheet className="h-4 w-4" />
                <span className="hidden sm:inline">{t.exportCsv}</span>
              </a>
            </Button>
            <NewCustomerButton />
          </div>
        }
      />

      <form method="get" className="relative max-w-md">
        {filter && <input type="hidden" name="filter" value={filter} />}
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

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filterChips.map((chip) => {
          const active = (chip.value ?? undefined) === (filter ?? undefined);
          return (
            <FilterChip key={chip.label} href={chipHref(chip.value)} active={active} count={chip.count}>
              {chip.label}
            </FilterChip>
          );
        })}
      </div>

      {customers.length === 0 ? (
        query || filter ? (
          <EmptyState
            icon={SearchX}
            title={t.noMatches}
            description={query ? t.nothingFound.replace("{q}", query) : t.noCustomersDesc}
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
                      <TableHead>{t.colLastVisit}</TableHead>
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
                        <TableCell className="whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400 tabular-nums">
                          {customer.records[0]
                            ? formatDate(customer.records[0].date, locale)
                            : "—"}
                        </TableCell>
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

          <CustomerCards customers={customerPeeks} />
        </section>
      )}

      <Pagination
        page={page}
        pageCount={pages}
        basePath="/admin/customers"
        params={{ q: query, filter, sort, dir }}
      />
    </div>
  );
}
