import Link from "next/link";
import {
  ClipboardList,
  CalendarDays,
  CalendarRange,
  Users,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

function startOfWeek() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return monday;
}

function startOfMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default async function AdminDashboardPage() {
  const [totalRecords, recordsThisWeek, recordsThisMonth, activeWorkers, recentRecords] =
    await Promise.all([
      prisma.workRecord.count(),
      prisma.workRecord.count({ where: { date: { gte: startOfWeek() } } }),
      prisma.workRecord.count({ where: { date: { gte: startOfMonth() } } }),
      prisma.user.count({ where: { active: true } }),
      prisma.workRecord.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { submittedBy: { select: { name: true } } },
      }),
    ]);

  const stats = [
    { label: "Total Records", value: totalRecords, icon: ClipboardList },
    { label: "This Week", value: recordsThisWeek, icon: CalendarDays },
    { label: "This Month", value: recordsThisMonth, icon: CalendarRange },
    { label: "Active Workers", value: activeWorkers, icon: Users },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <stat.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-2xl font-semibold text-slate-900">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <CardTitle className="text-base">All Work Records</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                View and filter every submitted record
              </p>
            </div>
            <Button asChild variant="outline" size="icon">
              <Link href="/admin/records" aria-label="Go to records">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <CardTitle className="text-base">Manage Workers</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                Create accounts, deactivate, reset passwords
              </p>
            </div>
            <Button asChild variant="outline" size="icon">
              <Link href="/admin/workers" aria-label="Go to workers">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Records</CardTitle>
        </CardHeader>
        <CardContent>
          {recentRecords.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No records yet"
              description="Submitted work records will show up here."
            />
          ) : (
            <div className="flex flex-col divide-y divide-slate-100">
              {recentRecords.map((record) => (
                <Link
                  key={record.id}
                  href={`/admin/records/${record.id}`}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900">
                      Job #{record.jobNumber} — {record.customerName}
                    </div>
                    <div className="text-sm text-slate-500">
                      {record.submittedBy.name} · {formatDate(record.date)} ·{" "}
                      {formatTime(record.arrivalTime)}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
