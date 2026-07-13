import Link from "next/link";
import { ArrowLeft, ChevronDown, Copy, ListChecks, Pencil, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DeleteTemplateButton } from "@/components/checklists/DeleteTemplateButton";
import {
  createTemplateAction,
  duplicateTemplateAction,
  updateTemplateAction,
} from "@/actions/checklists";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { getT } from "@/lib/i18n/server";

export default async function ChecklistTemplatesPage() {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const t = (await getT()).checklists;

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
          {t.projects}
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
            <ListChecks className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {t.title}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Create template */}
      <Card>
        <details className="group" open={templates.length === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden [&::marker]:hidden">
            <span className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <Plus className="h-4 w-4" />
              {t.newTemplate}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400 transition-transform group-open:rotate-180" />
          </summary>
          <form action={createTemplateAction} className="flex flex-col gap-3 px-4 pb-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">{t.templateName}</span>
              <Input name="name" placeholder={t.templateNamePlaceholder} maxLength={80} required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">
                {t.steps}
              </span>
              <Textarea
                name="items"
                rows={6}
                required
                placeholder={t.stepsPlaceholder}
              />
            </label>
            <div className="flex justify-end">
              <Button type="submit" size="sm">
                <Plus className="h-4 w-4" />
                {t.saveTemplate}
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
              title={t.noTemplatesYet}
              description={t.noTemplatesDesc}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="min-w-0 truncate font-semibold text-neutral-900 dark:text-neutral-100">
                    {template.name}
                  </h3>
                  <span className="shrink-0 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium tabular-nums text-neutral-600 dark:text-neutral-300">
                    {(template.items.length === 1 ? t.stepCountOne : t.stepCountMany).replace(
                      "{n}",
                      String(template.items.length)
                    )}
                  </span>
                </div>
                <ol className="flex flex-col gap-1.5">
                  {template.items.map((item, i) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-medium tabular-nums text-neutral-500 dark:text-neutral-400">
                        {i + 1}
                      </span>
                      <span className="min-w-0">{item.text}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>

              {/* Edit - rename + rewrite steps */}
              <details className="group border-t border-neutral-200 dark:border-neutral-800">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 [&::-webkit-details-marker]:hidden [&::marker]:hidden">
                  <span className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    <Pencil className="h-3.5 w-3.5" />
                    {t.edit}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400 transition-transform group-open:rotate-180" />
                </summary>
                <form
                  action={updateTemplateAction.bind(null, template.id)}
                  className="flex flex-col gap-3 px-4 pb-4"
                >
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">{t.templateName}</span>
                    <Input
                      name="name"
                      defaultValue={template.name}
                      maxLength={80}
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {t.steps}
                    </span>
                    <Textarea
                      name="items"
                      rows={6}
                      required
                      defaultValue={template.items.map((i) => i.text).join("\n")}
                    />
                  </label>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm">
                      <Pencil className="h-4 w-4" />
                      {t.saveChanges}
                    </Button>
                  </div>
                </form>
              </details>

              <div className="flex items-center gap-2 border-t border-neutral-200 dark:border-neutral-800 p-3">
                <form action={duplicateTemplateAction.bind(null, template.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    <Copy className="h-4 w-4" />
                    {t.duplicate}
                  </Button>
                </form>
                <div className="ml-auto">
                  <DeleteTemplateButton
                    templateId={template.id}
                    templateName={template.name}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
