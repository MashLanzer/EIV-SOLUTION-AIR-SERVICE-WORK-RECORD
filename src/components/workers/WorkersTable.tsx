import Link from "next/link";
import type { User } from "@prisma/client";
import { Users, SearchX, Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortHeader } from "@/components/ui/sort-header";
import { DataField } from "@/components/ui/data-field";
import { MobileCardList, MobileCardRow } from "@/components/ui/responsive-table";
import type { SortDir } from "@/lib/sort";

export function WorkersTable({
  workers,
  total,
  sort,
  dir,
  query,
}: {
  workers: User[];
  total: number;
  sort: string;
  dir: SortDir;
  query?: string;
}) {
  const sortProps = {
    sort,
    dir,
    basePath: "/admin/workers",
    params: { q: query },
  };
  if (workers.length === 0) {
    return query ? (
      <EmptyState
        icon={SearchX}
        title="No matches"
        description={`Nothing found for "${query}".`}
        action={
          <Button asChild variant="outline" className="mt-2">
            <Link href="/admin/workers">Clear search</Link>
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={Users}
        title="No worker accounts yet"
        description="Create one to get your team started."
      />
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {total} Worker{total === 1 ? "" : "s"}
      </h2>
      <div className="hidden sm:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortHeader column="name" label="Name" {...sortProps} />
                  </TableHead>
                  <TableHead>
                    <SortHeader column="email" label="Email" {...sortProps} />
                  </TableHead>
                  <TableHead>
                    <SortHeader column="role" label="Role" {...sortProps} />
                  </TableHead>
                  <TableHead>
                    <SortHeader column="status" label="Status" {...sortProps} />
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workers.map((worker) => (
                  <TableRow key={worker.id}>
                    <TableCell>{worker.name}</TableCell>
                    <TableCell>{worker.email}</TableCell>
                    <TableCell>
                      <Badge variant={worker.role === "ADMIN" ? "default" : "secondary"}>
                        {worker.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={worker.active ? "success" : "destructive"}>
                        {worker.active ? "Active" : "Inactive"}
                      </Badge>
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
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <MobileCardList>
        {workers.map((worker) => (
          <MobileCardRow
            key={worker.id}
            actions={
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/workers/${worker.id}`}>
                  <Settings className="h-4 w-4" />
                  Manage
                </Link>
              </Button>
            }
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {worker.name}
              </span>
              <Badge variant={worker.active ? "success" : "destructive"}>
                {worker.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DataField label="Email" value={worker.email} />
              <DataField
                label="Role"
                value={
                  <Badge variant={worker.role === "ADMIN" ? "default" : "secondary"}>
                    {worker.role}
                  </Badge>
                }
              />
            </div>
          </MobileCardRow>
        ))}
      </MobileCardList>
    </section>
  );
}
