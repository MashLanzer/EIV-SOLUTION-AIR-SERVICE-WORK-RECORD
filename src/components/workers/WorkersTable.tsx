import Link from "next/link";
import type { User } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No worker accounts yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Username</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {workers.map((worker) => (
          <TableRow key={worker.id}>
            <TableCell>{worker.name}</TableCell>
            <TableCell>{worker.username}</TableCell>
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
                <Link href={`/admin/workers/${worker.id}`}>Manage</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
