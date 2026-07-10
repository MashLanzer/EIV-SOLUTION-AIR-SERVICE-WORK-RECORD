import Link from "next/link";
import { ArrowLeft, ChevronDown, ListChecks, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createTemplateAction, deleteTemplateAction } from "@/actions/checklists";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";

export default async function ChecklistTemplatesPage() {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const templates = await prisma.checklistTemplate.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    include: {
      items: { orderBy: { position: "asc" }, select: { id: true, text: true } },
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/admin/projects"
          className="flex w-fit items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Checklist templates
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Reusable step lists you can drop onto any project.
        </p>
      </div>

      {/* Create template */}
      <Card>
        <details className="group" open={templates.length === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden [&::marker]:hidden">
            <span className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <Plus className="h-4 w-4" />
              New template
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400 transition-transform group-open:rotate-180" />
          </summary>
          <form action={createTemplateAction} className="flex flex-col gap-3 px-4 pb-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">Template name</span>
              <Input name="name" placeholder="e.g. Furnace install" maxLength={80} required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">
                Items — one per line
              </span>
              <Textarea
                name="items"
                rows={6}
                required
                placeholder={"Shut off power\nDisconnect old unit\nSet new unit\nConnect line set\nStart-up test"}
              />
            </label>
            <div className="flex justify-end">
              <Button type="submit" size="sm">
                <Plus className="h-4 w-4" />
                Save template
              </Button>
            </div>
          </form>
        </details>
      </Card>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={ListChecks}
              title="No templates yet"
              description="Create a template above so your crew can apply a standard checklist in one click."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {template.name}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                      {template.items.length} item{template.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <form action={deleteTemplateAction.bind(null, template.id)}>
                    <button
                      type="submit"
                      aria-label={`Delete template ${template.name}`}
                      className="shrink-0 text-neutral-400 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
                <ul className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-300">
                  {template.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                      {item.text}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
