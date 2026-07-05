import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, Mail, MapPin, Pencil, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
  searchParams: Promise<{ saved?: string; merged?: string }>;
}) {
  const { id } = await params;
  const { saved, merged } = await searchParams;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      records: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          jobNumber: true,
          status: true,
          typeOfWork: true,
          submittedBy: { select: { name: true } },
        },
      },
    },
  });
  if (!customer) notFound();

  const others = await prisma.customer.findMany({
    where: { id: { not: id } },
    select: { id: true, name: true, address: true },
    orderBy: { name: "asc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      {saved && <SuccessToast message="Customer saved" />}
      {merged && <SuccessToast message="Customers merged" />}

      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {customer.name}
        </h1>
        <div className="mt-1 flex flex-col gap-1 text-sm text-slate-500">
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
          <CardTitle className="text-base">Customer details</CardTitle>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Job History ({customer.records.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {customer.records.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No jobs yet"
              description="Work records for this customer will show up here."
            />
          ) : (
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
                {customer.records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{formatDate(record.date)}</TableCell>
                    <TableCell>{record.jobNumber}</TableCell>
                    <TableCell>
                      <StatusBadge status={record.status} />
                    </TableCell>
                    <TableCell>{record.typeOfWork}</TableCell>
                    <TableCell>{record.submittedBy.name}</TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
