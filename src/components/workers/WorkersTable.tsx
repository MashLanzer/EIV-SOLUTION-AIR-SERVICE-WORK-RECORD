import Link from "next/link";
import type { User } from "@prisma/client";
import { ChevronRight, Mail, Settings } from "lucide-react";

import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MobileCardList } from "@/components/ui/responsive-table";

export interface WorkerStat {
  jobs: number;
  lastActive: string | null;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "success" : "destructive"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

// One role group (Administrators or Field workers). The page renders it
// twice; the section title carries its own count so the two lists read as
// clearly separate rosters.
export function WorkersSection({
  title,
  workers,
  stats,
  className,
  style,
}: {
  title: string;
  workers: User[];
  stats: Record<string, WorkerStat>;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section className={`flex flex-col gap-3 ${className ?? ""}`} style={style}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {title} ({workers.length})
      </h2>

      {workers.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
            Nobody here yet.
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
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Jobs</TableHead>
                      <TableHead>Last active</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workers.map((worker) => {
                      const stat = stats[worker.id];
                      return (
                        <TableRow key={worker.id}>
                          <TableCell className="font-medium text-neutral-900 dark:text-neutral-100">
                            {worker.name}
                          </TableCell>
                          <TableCell>
                            <a
                              href={`mailto:${worker.email}`}
                              className="hover:text-primary"
                            >
                              {worker.email}
                            </a>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {stat?.jobs ?? 0}
                          </TableCell>
                          <TableCell className="text-neutral-500 dark:text-neutral-400">
                            {stat?.lastActive ? formatDate(stat.lastActive) : "—"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge active={worker.active} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/admin/workers/${worker.id}`}>
                                <Settings className="h-4 w-4" />
                                Manage
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <MobileCardList>
            {workers.map((worker) => {
              const stat = stats[worker.id];
              return (
                <Card key={worker.id}>
                  <Link
                    href={`/admin/workers/${worker.id}`}
                    className="flex items-start gap-3 p-4 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/60"
                  >
                    <AvatarInitials name={worker.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
                          {worker.name}
                        </span>
                        <StatusBadge active={worker.active} />
                      </div>
                      <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{worker.email}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                        {stat?.jobs ?? 0} job{(stat?.jobs ?? 0) === 1 ? "" : "s"}
                        {stat?.lastActive ? ` · Last active ${formatDate(stat.lastActive)}` : ""}
                      </div>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                  </Link>
                </Card>
              );
            })}
          </MobileCardList>
        </>
      )}
    </section>
  );
}
