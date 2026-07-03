import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default async function AdminDashboardPage() {
  const [totalRecords, recordsThisWeek, recordsThisMonth, activeWorkers] =
    await Promise.all([
      prisma.workRecord.count(),
      prisma.workRecord.count({ where: { date: { gte: startOfWeek() } } }),
      prisma.workRecord.count({ where: { date: { gte: startOfMonth() } } }),
      prisma.user.count({ where: { active: true } }),
    ]);

  const stats = [
    { label: "Total Records", value: totalRecords },
    { label: "This Week", value: recordsThisWeek },
    { label: "This Month", value: recordsThisMonth },
    { label: "Active Workers", value: activeWorkers },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="text-2xl font-semibold text-slate-900">
                {stat.value}
              </div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>All Work Records</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/admin/records" className="text-sm text-slate-700 underline">
              View and filter every submitted record →
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Manage Workers</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/admin/workers" className="text-sm text-slate-700 underline">
              Create accounts, deactivate, reset passwords →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
