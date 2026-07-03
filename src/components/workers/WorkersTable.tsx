import Link from "next/link";
import type { User } from "@prisma/client";
import { Users, Settings } from "lucide-react";

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

export function WorkersTable({ workers }: { workers: User[] }) {
  if (workers.length === 0) {
    return (
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
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
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
