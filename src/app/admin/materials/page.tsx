import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { MaterialsManager, type MaterialRow } from "@/components/materials/MaterialsManager";
import { prisma } from "@/lib/prisma";
import { getCurrencySymbol } from "@/lib/currency";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AdminMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requirePermission("expenses.manage");
  const organizationId = requireOrgId(session);
  const { q } = await searchParams;
  const query = q?.trim() || undefined;

  const where = {
    organizationId,
    ...(query ? { name: { contains: query, mode: "insensitive" as const } } : {}),
  };

  const [rows, totalCount, currency] = await Promise.all([
    prisma.material.findMany({
      where,
      orderBy: { name: "asc" },
      take: 300,
      select: { id: true, name: true, unit: true, unitCost: true },
    }),
    prisma.material.count({ where: { organizationId } }),
    getCurrencySymbol(organizationId),
  ]);

  const t = (await getT()).materials;

  const materials: MaterialRow[] = rows.map((m) => ({
    id: m.id,
    name: m.name,
    unit: m.unit,
    unitCost: Number(m.unitCost),
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t.title} description={t.subtitle} />

      <div className="grid animate-fade-up grid-cols-1 gap-3 sm:grid-cols-2">
        <StatTile value={String(totalCount)} label={t.catalog} />
      </div>

      <form method="get" className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
        <Input
          type="search"
          name="q"
          placeholder={t.searchPlaceholder}
          defaultValue={query}
          className="pl-9"
          aria-label={t.searchAria}
        />
      </form>

      {query && materials.length > 0 && (
        <p className="px-1 text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {(materials.length === 1 ? t.countOne : t.countMany).replace(
            "{n}",
            String(materials.length)
          )}
        </p>
      )}

      <MaterialsManager materials={materials} currency={currency} filtering={Boolean(query)} />
    </div>
  );
}
