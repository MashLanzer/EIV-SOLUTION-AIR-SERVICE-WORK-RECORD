import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, Mail, MapPin, Pencil, Phone } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataField } from "@/components/ui/data-field";
import { EmptyState } from "@/components/ui/empty-state";
import { MobileCardList, MobileCardRow } from "@/components/ui/responsive-table";
import { Pagination } from "@/components/ui/pagination";
import { SuccessToast } from "@/components/ui/success-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerEditForm } from "@/components/customers/CustomerEditForm";
import { DeleteCustomerButton } from "@/components/customers/DeleteCustomerButton";
import { MergeCustomerForm } from "@/components/customers/MergeCustomerForm";
import { StatusBadge } from "@/components/records/StatusBadge";
import { pageCount, paginationArgs, parsePage } from "@/lib/paginate";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default async function AdminCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    merged?: string;
    error?: string;
    page?: string;
  }>;
}) {
  const { id } = await params;
  const { saved, merged, error, page: rawPage } = await searchParams;
  const page = parsePage(rawPage);

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  const [recordCount, records] = await Promise.all([
    prisma.workRecord.count({ where: { customerId: id } }),
    prisma.workRecord.findMany({
      where: { customerId: id },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        jobNumber: true,
        status: true,
        typeOfWork: true,
        submittedBy: { select: { name: true } },
      },
      ...paginationArgs(page),
    }),
  ]);
  const pages = pageCount(recordCount);

  const others = await prisma.customer.findMany({
    where: { id: { not: id } },
    select: { id: true, name: true, address: true },
    orderBy: { name: "asc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-4">
      {saved && <SuccessToast message="Customer saved" aboveMobileNav />}
      {merged && <SuccessToast message="Customers merged" aboveMobileNav />}
      {error === "merge" && (
        <Alert variant="error">
          Couldn&apos;t merge - pick a valid customer to merge into and try
          again.
        </Alert>
      )}

      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {customer.name}
        </h1>
        <div className="mt-1 flex flex-col gap-1 text-sm text-neutral-500 dark:text-neutral-400">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0" />
            {customer.address}
          </span>
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center gap-1.5 hover:text-primary"
            >
              <Phone className="h-4 w-4 shrink-0" />
              {customer.phone}
            </a>
          )}
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex items-center gap-1.5 hover:text-primary"
            >
              <Mail className="h-4 w-4 shrink-0" />
              {customer.email}
            </a>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Customer details</CardTitle>
          <div className="flex gap-2">
            <MergeCustomerForm sourceId={customer.id} others={others} />
            <DeleteCustomerButton customerId={customer.id} />
          </div>
        </CardHeader>
        <CardContent>
          <CustomerEditForm
            customerId={customer.id}
            defaultValues={{
              name: customer.name,
              address: customer.address,
              phone: customer.phone ?? "",
              email: customer.email ?? "",
            }}
          />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Job History ({recordCount})
        </h2>
        {records.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={ClipboardList}
                title="No jobs yet"
                description="Work records for this customer will show up here."
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="hidden sm:block">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Job #</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Type of Work</TableHead>
                        <TableHead>Submitted By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{formatDate(record.date)}</TableCell>
                          <TableCell>{record.jobNumber}</TableCell>
                          <TableCell>
                            <StatusBadge status={record.status} />
                          </TableCell>
                          <TableCell>{record.typeOfWork}</TableCell>
                          <TableCell>{record.submittedBy?.name ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="outline" size="icon">
                              <Link
                                href={`/admin/records/${record.id}`}
                                aria-label={`Edit record ${record.jobNumber}`}
                              >
                                <Pencil className="h-4 w-4" />
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
              {records.map((record) => (
                <MobileCardRow
                  key={record.id}
                  actions={
                    <Button asChild variant="outline" size="icon">
                      <Link
                        href={`/admin/records/${record.id}`}
                        aria-label={`Edit record ${record.jobNumber}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      Job #{record.jobNumber}
                    </span>
                    <StatusBadge status={record.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <DataField label="Date" value={formatDate(record.date)} />
                    <DataField label="Type of Work" value={record.typeOfWork} />
                    <DataField label="Submitted By" value={record.submittedBy?.name ?? "—"} />
                  </div>
                </MobileCardRow>
              ))}
            </MobileCardList>
          </>
        )}
      </section>

      <Pagination
        page={page}
        pageCount={pages}
        basePath={`/admin/customers/${id}`}
      />
    </div>
  );
}
