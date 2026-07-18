"use client";

import { useMemo, useState } from "react";
import { Copy, ListChecks, Pencil, Plus, Search } from "lucide-react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
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
import { useT } from "@/components/i18n/LocaleProvider";

export interface TemplateData {
  id: string;
  name: string;
  items: string[];
}

// Manage checklist templates: search, create and edit in bottom sheets
// (matching the rest of the app), duplicate and delete inline. Server actions
// revalidate the page, so the list refreshes after each save.
export function TemplateManager({ templates }: { templates: TemplateData[] }) {
  const t = useT().checklists;
  const tc = useT().common;
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateData | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? templates.filter((tpl) => tpl.name.toLowerCase().includes(q)) : templates;
  }, [templates, query]);

  async function submitCreate(formData: FormData) {
    await createTemplateAction(formData);
    setCreateOpen(false);
  }
  async function submitEdit(formData: FormData) {
    if (!editing) return;
    await updateTemplateAction(editing.id, formData);
    setEditing(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {templates.length > 3 && (
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchTemplates}
              aria-label={t.searchTemplates}
              className="pl-9"
            />
          </div>
        )}
        <Button type="button" size="sm" className="ml-auto" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t.newTemplate}
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={ListChecks} title={t.noTemplatesYet} description={t.noTemplatesDesc} />
          </CardContent>
        </Card>
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">{t.noMatches}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((template) => (
            <Card key={template.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="min-w-0 truncate font-semibold text-neutral-900 dark:text-neutral-100">
                    {template.name}
                  </h3>
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium tabular-nums text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {(template.items.length === 1 ? t.stepCountOne : t.stepCountMany).replace(
                      "{n}",
                      String(template.items.length)
                    )}
                  </span>
                </div>
                <ol className="flex flex-col gap-1.5">
                  {template.items.map((text, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-medium tabular-nums text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {i + 1}
                      </span>
                      <span className="min-w-0">{text}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>

              <div className="flex items-center gap-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing(template)}>
                  <Pencil className="h-4 w-4" />
                  {t.edit}
                </Button>
                <form action={duplicateTemplateAction.bind(null, template.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    <Copy className="h-4 w-4" />
                    {t.duplicate}
                  </Button>
                </form>
                <div className="ml-auto">
                  <DeleteTemplateButton templateId={template.id} templateName={template.name} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create */}
      <BottomSheet open={createOpen} onClose={() => setCreateOpen(false)} title={t.newTemplate} closeLabel={tc.close}>
        <form action={submitCreate} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">{t.templateName}</span>
            <Input name="name" placeholder={t.templateNamePlaceholder} maxLength={80} required autoFocus />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500 dark:text-neutral-400">{t.steps}</span>
            <Textarea name="items" rows={7} required placeholder={t.stepsPlaceholder} />
          </label>
          <Button type="submit" className="w-full">
            <Plus className="h-4 w-4" />
            {t.saveTemplate}
          </Button>
        </form>
      </BottomSheet>

      {/* Edit */}
      <BottomSheet open={editing !== null} onClose={() => setEditing(null)} title={t.editTemplate} closeLabel={tc.close}>
        {editing && (
          <form action={submitEdit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">{t.templateName}</span>
              <Input name="name" defaultValue={editing.name} maxLength={80} required autoFocus />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">{t.steps}</span>
              <Textarea name="items" rows={7} required defaultValue={editing.items.join("\n")} />
            </label>
            <Button type="submit" className="w-full">
              <Pencil className="h-4 w-4" />
              {t.saveChanges}
            </Button>
          </form>
        )}
      </BottomSheet>
    </div>
  );
}
