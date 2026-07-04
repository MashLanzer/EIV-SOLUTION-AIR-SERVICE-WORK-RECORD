import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, MapPin, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {customer.name}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin className="h-4 w-4 shrink-0" />
          {customer.address}
        </p>
      </div>

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
