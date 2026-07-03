import { notFound } from "next/navigation";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RecordDetail } from "@/components/records/RecordDetail";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAuth();

  const record = await prisma.workRecord.findUnique({ where: { id } });
  if (!record) notFound();
  if (session.user.role !== "ADMIN" && record.submittedById !== session.user.id) {
    notFound();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Job #{record.jobNumber}</CardTitle>
        <Button asChild variant="outline" size="sm">
          <Link href={`/records/${record.id}/pdf`}>Download PDF</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <RecordDetail record={record} />
      </CardContent>
    </Card>
  );
}
