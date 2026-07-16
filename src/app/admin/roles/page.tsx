import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SuccessToast } from "@/components/ui/success-toast";
import { EditRoleSheet, type RolePosition } from "@/components/roles/EditRoleSheet";
import { NewRoleButton } from "@/components/roles/NewRoleButton";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { ensureDefaultPositions } from "@/lib/positions";
import type { AccessLevel } from "@/lib/permissions";
import { getT } from "@/lib/i18n/server";

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const session = await requirePermission("settings.manage");
  const organizationId = requireOrgId(session);
  const { saved } = await searchParams;

  // Seed the three built-in positions the first time this page is opened, so a
  // company always has its Administrator / Supervisor / Worker roles.
  await ensureDefaultPositions(organizationId);

  const positions = await prisma.position.findMany({
    where: { organizationId },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      color: true,
      accessLevel: true,
      permissions: true,
      isSystem: true,
      _count: { select: { members: true } },
    },
  });

  const dict = await getT();
  const t = dict.roles;

  const rows: RolePosition[] = positions.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    accessLevel: p.accessLevel as AccessLevel,
    permissions: p.permissions,
    isSystem: p.isSystem,
    memberCount: p._count.members,
  }));

  const office = rows.filter((r) => r.accessLevel === "ADMIN");
  const field = rows.filter((r) => r.accessLevel === "WORKER");

  const section = (title: string, hint: string, items: RolePosition[]) =>
    items.length === 0 ? null : (
      <section className="flex flex-col gap-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {title}
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{hint}</p>
        </div>
        <Card>
          <CardContent className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 p-0">
            {items.map((p) => (
              <EditRoleSheet key={p.id} position={p} />
            ))}
          </CardContent>
        </Card>
      </section>
    );

  return (
    <div className="flex flex-col gap-4">
      {saved && <SuccessToast message={t.saveRole} aboveMobileNav />}
      <PageHeader title={t.title} description={t.subtitle} action={<NewRoleButton />} />
      {section(t.officeRoles, t.officeHint, office)}
      {section(t.fieldRoles, t.fieldHint, field)}
    </div>
  );
}
