import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
    <div className="flex flex-col gap-4 pb-20 sm:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">My Records</h1>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/records/new">
            <Plus className="h-4 w-4" />
            New Record
          </Link>
        </Button>
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No records yet"
          description="Work records you submit will show up here."
          action={
            <Button asChild className="mt-2 sm:hidden">
              <Link href="/records/new">
                <Plus className="h-4 w-4" />
                New Record
              </Link>
            </Button>
          }
        />
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

      <Link
        href="/records/new"
        aria-label="New Record"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-primary-hover sm:hidden"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
