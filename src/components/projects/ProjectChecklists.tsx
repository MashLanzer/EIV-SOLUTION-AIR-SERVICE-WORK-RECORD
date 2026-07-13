import Link from "next/link";
import { Check, ChevronDown, ListChecks, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  addChecklistAction,
  addChecklistItemAction,
  deleteChecklistAction,
  deleteChecklistItemAction,
  toggleChecklistItemAction,
} from "@/actions/checklists";
import { getT } from "@/lib/i18n/server";
import { cn } from "@/lib/utils";

export interface ChecklistItemView {
  id: string;
  text: string;
  done: boolean;
}

export interface ChecklistView {
  id: string;
  name: string;
  items: ChecklistItemView[];
}

export async function ProjectChecklists({
  projectId,
  checklists,
  templates,
  canManage = true,
}: {
  projectId: string;
  checklists: ChecklistView[];
  templates: { id: string; name: string }[];
  // Admins manage checklists (add/delete lists + items); workers can only
  // check items off.
  canManage?: boolean;
}) {
  const dict = await getT();
  const t = dict.projects;
  return (
    <div className="flex flex-col gap-3">
      {/* Add checklist - collapsed disclosure so it stays out of the way */}
      {canManage && (
      <Card>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden [&::marker]:hidden">
            <span className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <Plus className="h-4 w-4" />
              {t.addChecklist}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400 transition-transform group-open:rotate-180" />
          </summary>
          <form
            action={addChecklistAction.bind(null, projectId)}
            className="flex flex-col gap-3 px-4 pb-4"
          >
            {templates.length > 0 && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  {t.fromTemplate}
                </span>
                <Select name="templateId" defaultValue="">
                  <option value="">{t.blankChecklist}</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-500 dark:text-neutral-400">
                {t.checklistNameLabel}{" "}
                <span className="text-neutral-400">
                  {t.nameOptionalTemplate}
                </span>
              </span>
              <Input name="name" placeholder={t.checklistNamePlaceholder} maxLength={80} />
            </label>
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/admin/checklists"
                className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary"
              >
                {t.manageTemplates}
              </Link>
              <Button type="submit" size="sm">
                <Plus className="h-4 w-4" />
                {t.addChecklistBtn}
              </Button>
            </div>
          </form>
        </details>
      </Card>
      )}

      {checklists.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={ListChecks}
              title={t.noChecklists}
              description={canManage ? t.noChecklistsManage : t.noChecklistsWorker}
            />
          </CardContent>
        </Card>
      ) : (
        checklists.map((checklist) => {
          const total = checklist.items.length;
          const done = checklist.items.filter((i) => i.done).length;
          const pct = total === 0 ? 0 : Math.round((done / total) * 100);
          return (
            <Card key={checklist.id}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {checklist.name}
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                      {t.doneCount.replace("{done}", String(done)).replace("{total}", String(total))}
                    </p>
                  </div>
                  {canManage && (
                    <form action={deleteChecklistAction.bind(null, checklist.id)}>
                      <button
                        type="submit"
                        aria-label={t.deleteChecklistAria.replace("{name}", checklist.name)}
                        className="shrink-0 text-neutral-400 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  )}
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <ul className="flex flex-col">
                  {checklist.items.map((item) => (
                    <li
                      key={item.id}
                      className="group flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 py-2 last:border-0"
                    >
                      <form action={toggleChecklistItemAction.bind(null, item.id)}>
                        <button
                          type="submit"
                          aria-label={
                            (item.done ? t.markNotDone : t.markDone).replace("{text}", item.text)
                          }
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                            item.done
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-neutral-300 dark:border-neutral-600 hover:border-primary"
                          )}
                        >
                          {item.done && <Check className="h-3.5 w-3.5" />}
                        </button>
                      </form>
                      <span
                        className={cn(
                          "flex-1 text-sm",
                          item.done
                            ? "text-neutral-400 line-through"
                            : "text-neutral-900 dark:text-neutral-100"
                        )}
                      >
                        {item.text}
                      </span>
                      {canManage && (
                        <form action={deleteChecklistItemAction.bind(null, item.id)}>
                          <button
                            type="submit"
                            aria-label={t.deleteItemAria.replace("{text}", item.text)}
                            className="shrink-0 text-neutral-300 dark:text-neutral-600 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>

                {canManage && (
                  <form
                    action={addChecklistItemAction.bind(null, checklist.id)}
                    className="flex gap-2"
                  >
                    <Input name="text" placeholder={t.addItemPlaceholder} maxLength={200} />
                    <Button type="submit" variant="outline" size="sm">
                      {t.addItem}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
