import Link from "next/link";
import { ClipboardList, Plus, Search, SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SuccessToast } from "@/components/ui/success-toast";
import { RecordCard } from "@/components/records/RecordCard";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; saved?: string }>;
}) {
  const session = await requireAuth();
  const { q, saved } = await searchParams;
  const query = q?.trim() || undefined;

  const records = await prisma.workRecord.findMany({
    where: {
      submittedById: session.user.id,
      ...(query
        ? {
            OR: [
              { jobNumber: { contains: query, mode: "insensitive" } },
              { customerName: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { date: "desc" },
  });

  return (
    <div className="flex flex-col gap-4 pb-20 sm:pb-0">
      {saved && <SuccessToast message="Record saved" />}

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">My Records</h1>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/records/new">
            <Plus className="h-4 w-4" />
            New Record
          </Link>
        </Button>
      </div>

      <form method="get" className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          name="q"
          placeholder="Search by job # or customer"
          defaultValue={query}
          className="pl-9"
          aria-label="Search my records"
        />
      </form>

      {records.length === 0 ? (
        query ? (
          <EmptyState
            icon={SearchX}
            title="No matches"
            description={`Nothing found for "${query}".`}
            action={
              <Button asChild variant="outline" className="mt-2">
                <Link href="/records">Clear search</Link>
              </Button>
            }
          />
        ) : (
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
        )
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
        className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-primary-hover sm:hidden"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
