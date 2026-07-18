import { PageHeader } from "@/components/ui/page-header";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { TemplateManager, type TemplateData } from "@/components/checklists/TemplateManager";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

export default async function ChecklistTemplatesPage() {
  const session = await requirePermission("checklists.manage");
  const organizationId = requireOrgId(session);
  const t = (await getT()).checklists;

  const rows = await prisma.checklistTemplate.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    include: {
      items: { orderBy: { position: "asc" }, select: { text: true } },
    },
  });
  const templates: TemplateData[] = rows.map((tpl) => ({
    id: tpl.id,
    name: tpl.name,
    items: tpl.items.map((i) => i.text),
  }));

  return (
    <div className="flex flex-col gap-4">
      <SectionTabs family="structure" />
      <PageHeader
        title={t.title}
        description={t.subtitle}
        backHref="/admin/projects"
        backLabel={t.projects}
      />
      <TemplateManager templates={templates} />
    </div>
  );
}
