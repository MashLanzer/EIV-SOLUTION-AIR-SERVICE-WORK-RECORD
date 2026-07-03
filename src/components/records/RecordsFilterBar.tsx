import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { RecordFilterParams } from "@/lib/recordFilters";

interface Worker {
  id: string;
  name: string;
}

export function RecordsFilterBar({
  filters,
  workers,
}: {
  filters: RecordFilterParams;
  workers: Worker[];
}) {
  return (
    <form method="GET" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <div className="flex flex-col gap-1">
        <Label htmlFor="dateFrom">From</Label>
        <Input
          id="dateFrom"
          name="dateFrom"
          type="date"
          defaultValue={filters.dateFrom}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="dateTo">To</Label>
        <Input id="dateTo" name="dateTo" type="date" defaultValue={filters.dateTo} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="workerId">Worker</Label>
        <Select id="workerId" name="workerId" defaultValue={filters.workerId ?? ""}>
          <option value="">All</option>
          {workers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="customerName">Customer</Label>
        <Input
          id="customerName"
          name="customerName"
          defaultValue={filters.customerName}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="jobNumber">Job #</Label>
        <Input id="jobNumber" name="jobNumber" defaultValue={filters.jobNumber} />
      </div>
      <div className="col-span-2 flex items-end gap-2 sm:col-span-5">
        <Button type="submit" variant="outline" size="sm">
          Apply Filters
        </Button>
        <Button type="button" variant="ghost" size="sm" asChild>
          <a href="/admin/records">Clear</a>
        </Button>
      </div>
    </form>
  );
}
