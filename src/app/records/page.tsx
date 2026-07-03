import Link from "next/link";

import { Button } from "@/components/ui/button";
import { RecordCard } from "@/components/records/RecordCard";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export default async function RecordsPage() {
  const session = await requireAuth();

  const records = await prisma.workRecord.findMany({
    where: { submittedById: session.user.id },
    orderBy: { date: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">My Records</h1>
        <Button asChild>
          <Link href="/records/new">New Record</Link>
        </Button>
      </div>

      {records.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          You haven&apos;t submitted any work records yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {records.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              href={`/records/${record.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
