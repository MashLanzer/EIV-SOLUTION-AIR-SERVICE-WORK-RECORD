import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DatePresets } from "@/components/ui/date-presets";
import { FilterActions, FilterBar, FilterField } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
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
    <FilterBar>
      <div className="col-span-2 sm:col-span-6">
        <DatePresets />
      </div>
      <FilterField label="From" htmlFor="dateFrom">
        <Input id="dateFrom" name="dateFrom" type="date" defaultValue={filters.dateFrom} />
      </FilterField>
      <FilterField label="To" htmlFor="dateTo">
        <Input id="dateTo" name="dateTo" type="date" defaultValue={filters.dateTo} />
      </FilterField>
      <FilterField label="Worker" htmlFor="workerId">
        <Select id="workerId" name="workerId" defaultValue={filters.workerId ?? ""}>
          <option value="">All</option>
          {workers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.name}
            </option>
          ))}
        </Select>
      </FilterField>
      <FilterField label="Customer" htmlFor="customerName">
        <Input id="customerName" name="customerName" defaultValue={filters.customerName} />
      </FilterField>
      <FilterField label="Job #" htmlFor="jobNumber">
        <Input id="jobNumber" name="jobNumber" defaultValue={filters.jobNumber} />
      </FilterField>
      <FilterField label="Status" htmlFor="status">
        <Select id="status" name="status" defaultValue={filters.status ?? ""}>
          <option value="">All</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="NEEDS_CHANGES">Needs changes</option>
          <option value="APPROVED">Approved</option>
        </Select>
      </FilterField>
      <FilterActions>
        <Button type="submit" variant="outline" size="default">
          Apply Filters
        </Button>
        <Button type="button" variant="ghost" size="default" asChild>
          <Link href="/admin/records">Clear</Link>
        </Button>
      </FilterActions>
    </FilterBar>
  );
}
