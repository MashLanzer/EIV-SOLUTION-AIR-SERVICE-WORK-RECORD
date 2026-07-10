import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Mail,
  MapPin,
  Pencil,
  Phone,
} from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { requireAdmin } from "@/lib/session";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatSince(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
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
  await requireAdmin();
  const { id } = await params;
  const { saved, merged, error, page: rawPage } = await searchParams;
  const page = parsePage(rawPage);

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  const [recordCount, statusGroups, records] = await Promise.all([
    prisma.workRecord.count({ where: { customerId: id } }),
    // Bounded to the 3 statuses - a tiny at-a-glance health breakdown.
    prisma.workRecord.groupBy({
      by: ["status"],
      where: { customerId: id },
      _count: { _all: true },
    }),
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

  const statusCount = (status: "APPROVED" | "SUBMITTED" | "NEEDS_CHANGES") =>
    statusGroups.find((g) => g.status === status)?._count._all ?? 0;
  const approvedCount = statusCount("APPROVED");
  const pendingCount = statusCount("SUBMITTED");
  const needsChangesCount = statusCount("NEEDS_CHANGES");

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

      {/* Header - customer identity inside a card for a tidy, pro look */}
      <Card className="animate-fade-up">
        <CardContent className="p-4">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            {customer.name}
          </h1>
          <div className="mt-2 flex flex-col gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              {customer.address}
            </span>
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="flex w-fit items-center gap-1.5 hover:text-primary"
              >
                <Phone className="h-4 w-4 shrink-0" />
                {customer.phone}
              </a>
            )}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="flex w-fit items-center gap-1.5 hover:text-primary"
              >
                <Mail className="h-4 w-4 shrink-0" />
                {customer.email}
              </a>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 shrink-0" />
              Customer since {formatSince(customer.createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Snapshot - total jobs + status breakdown */}
      <Card
        className="animate-fade-up"
        style={{ animationDelay: "40ms", animationFillMode: "both" }}
      >
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <ClipboardList className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {recordCount}
                </div>
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  Total jobs
                </div>
              </div>
            </div>
            {recordCount > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/admin/records?customerName=${encodeURIComponent(customer.name)}`}
                >
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>

          {recordCount > 0 && (
            <div className="grid grid-cols-3 gap-3 border-t border-neutral-200 dark:border-neutral-800 pt-4">
              <div>
                <div className="text-lg font-semibold tabular-nums text-success-text">
                  {approvedCount}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Approved
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                  {pendingCount}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Pending review
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold tabular-nums text-warning-text">
                  {needsChangesCount}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Needs changes
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job history - primary content, moved above editing */}
      <section
        className="flex animate-fade-up flex-col gap-3"
        style={{ animationDelay: "80ms", animationFillMode: "both" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Job history ({recordCount})
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

            <Pagination
              page={page}
              pageCount={pages}
              basePath={`/admin/customers/${id}`}
            />
          </>
        )}
      </section>

      {/* Manage - editing collapsed by default, secondary to viewing */}
      <section
        className="flex animate-fade-up flex-col gap-3"
        style={{ animationDelay: "120ms", animationFillMode: "both" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Manage
        </h2>
        <Card>
          {/* Collapsed by default so the edit form no longer dominates the
              page - the same details/summary pattern the records filter uses.
              Viewing the customer + history comes first; editing is a tap. */}
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden [&::marker]:hidden">
              <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Customer details
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="flex flex-col gap-4 px-4 pb-4">
              <CustomerEditForm
                customerId={customer.id}
                defaultValues={{
                  name: customer.name,
                  address: customer.address,
                  phone: customer.phone ?? "",
                  email: customer.email ?? "",
                }}
              />

              <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 dark:border-neutral-800 pt-4">
                <MergeCustomerForm sourceId={customer.id} others={others} />
                <DeleteCustomerButton customerId={customer.id} />
              </div>
            </div>
          </details>
        </Card>
      </section>
    </div>
  );
}
