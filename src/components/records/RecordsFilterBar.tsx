import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DatePresets } from "@/components/ui/date-presets";
import { FilterActions, FilterBar, FilterField } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getT } from "@/lib/i18n/server";
import type { RecordFilterParams } from "@/lib/recordFilters";

interface Worker {
  id: string;
  name: string;
}

export async function RecordsFilterBar({
  filters,
  workers,
}: {
  filters: RecordFilterParams;
  workers: Worker[];
}) {
  const dict = await getT();
  const t = dict.adminRecords;
  return (
    <FilterBar>
      <div className="col-span-2 sm:col-span-6">
        <DatePresets />
      </div>
      <FilterField label={t.from} htmlFor="dateFrom">
        <Input id="dateFrom" name="dateFrom" type="date" defaultValue={filters.dateFrom} />
      </FilterField>
      <FilterField label={t.to} htmlFor="dateTo">
        <Input id="dateTo" name="dateTo" type="date" defaultValue={filters.dateTo} />
      </FilterField>
      <FilterField label={t.worker} htmlFor="workerId">
        <Select id="workerId" name="workerId" defaultValue={filters.workerId ?? ""}>
          <option value="">{t.all}</option>
          {workers.map((worker) => (
            <option key={worker.id} value={worker.id}>
              {worker.name}
            </option>
          ))}
        </Select>
      </FilterField>
      <FilterField label={t.customer} htmlFor="customerName">
        <Input id="customerName" name="customerName" defaultValue={filters.customerName} />
      </FilterField>
      <FilterField label={dict.records.jobNumber} htmlFor="jobNumber">
        <Input id="jobNumber" name="jobNumber" defaultValue={filters.jobNumber} />
      </FilterField>
      <FilterField label={t.status} htmlFor="status">
        <Select id="status" name="status" defaultValue={filters.status ?? ""}>
          <option value="">{t.all}</option>
          <option value="SUBMITTED">{t.statusSubmitted}</option>
          <option value="NEEDS_CHANGES">{t.statusNeedsChanges}</option>
          <option value="APPROVED">{t.statusApproved}</option>
        </Select>
      </FilterField>
      <FilterActions>
        <Button type="submit" variant="outline" size="default">
          {t.applyFilters}
        </Button>
        <Button type="button" variant="ghost" size="default" asChild>
          <Link href="/admin/records">{t.clear}</Link>
        </Button>
      </FilterActions>
    </FilterBar>
  );
}
