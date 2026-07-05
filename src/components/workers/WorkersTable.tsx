import Link from "next/link";
import type { User } from "@prisma/client";
import { Users, SearchX, Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { SortDir } from "@/lib/sort";

export function WorkersTable({
  workers,
  sort,
  dir,
  query,
}: {
  workers: User[];
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
  );
}
