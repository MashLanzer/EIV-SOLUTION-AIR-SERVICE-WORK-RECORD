import { notFound } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SuccessToast } from "@/components/ui/success-toast";
import { RecordDetail } from "@/components/records/RecordDetail";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export default async function RecordDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const session = await requireAuth();

  const record = await prisma.workRecord.findUnique({
    where: { id },
    include: { photos: { orderBy: { position: "asc" } } },
  });
  if (!record) notFound();
  if (session.user.role !== "ADMIN" && record.submittedById !== session.user.id) {
    notFound();
  }

  return (
    <Card>
      {saved && <SuccessToast message="Record saved" />}
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Job #{record.jobNumber}</CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href={`/records/${record.id}/pdf`}>
            <Download className="h-4 w-4" />
            Download PDF
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <RecordDetail record={record} />
      </CardContent>
    </Card>
  );
}
