"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin, requireAuth } from "@/lib/session";

const MAX_ITEM_LEN = 200;
const MAX_NAME_LEN = 80;

// Split a textarea into trimmed, de-duplicated, capped item lines.
function parseItemLines(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of raw.split("\n")) {
    const text = line.trim().slice(0, MAX_ITEM_LEN);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= 100) break;
  }
  return out;
}

function projectPath(projectId: string) {
  return `/admin/projects/${projectId}`;
}

// ---- Templates (managed from /admin/checklists) ----------------------------

export async function createTemplateAction(formData: FormData) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const name = ((formData.get("name") as string | null) ?? "").trim().slice(0, MAX_NAME_LEN);
  const items = parseItemLines((formData.get("items") as string | null) ?? "");
  if (!name || items.length === 0) return;

  await prisma.checklistTemplate.create({
    data: {
      organizationId,
      name,
      items: {
        create: items.map((text, position) => ({ text, position })),
      },
    },
  });
  revalidatePath("/admin/checklists");
}

export async function deleteTemplateAction(templateId: string) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  await prisma.checklistTemplate.deleteMany({
    where: { id: templateId, organizationId },
  });
  revalidatePath("/admin/checklists");
}

// ---- Project checklists ----------------------------------------------------

// Add a checklist to a project - blank, or seeded from a template's items.
export async function addChecklistAction(projectId: string, formData: FormData) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
  if (!project) return;

  const templateId = ((formData.get("templateId") as string | null) ?? "").trim();
  let name = ((formData.get("name") as string | null) ?? "").trim().slice(0, MAX_NAME_LEN);
  let itemTexts: string[] = [];

  if (templateId) {
    const template = await prisma.checklistTemplate.findFirst({
      where: { id: templateId, organizationId },
      include: { items: { orderBy: { position: "asc" } } },
    });
    if (!template) return;
    if (!name) name = template.name;
    itemTexts = template.items.map((i) => i.text);
  }

  if (!name) return;

  await prisma.checklist.create({
    data: {
      organizationId,
      projectId,
      name,
      items: {
        create: itemTexts.map((text, position) => ({ text, position })),
      },
    },
  });
  revalidatePath(projectPath(projectId));
}

export async function deleteChecklistAction(checklistId: string) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const checklist = await prisma.checklist.findFirst({
    where: { id: checklistId, organizationId },
    select: { id: true, projectId: true },
  });
  if (!checklist) return;

  await prisma.checklist.delete({ where: { id: checklist.id } });
  revalidatePath(projectPath(checklist.projectId));
}

// Look up an item scoped to the caller's org, returning the project it lives
// under so we can revalidate the project page.
async function ownedItem(itemId: string, organizationId: string) {
  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, checklist: { organizationId } },
    select: { id: true, done: true, checklist: { select: { projectId: true } } },
  });
  return item;
}

export async function toggleChecklistItemAction(itemId: string) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const item = await ownedItem(itemId, organizationId);
  if (!item) return;

  const done = !item.done;
  await prisma.checklistItem.update({
    where: { id: item.id },
    data: { done, doneAt: done ? new Date() : null },
  });
  revalidatePath(projectPath(item.checklist.projectId));
}

export async function addChecklistItemAction(checklistId: string, formData: FormData) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const checklist = await prisma.checklist.findFirst({
    where: { id: checklistId, organizationId },
    select: { id: true, projectId: true },
  });
  if (!checklist) return;

  const text = ((formData.get("text") as string | null) ?? "").trim().slice(0, MAX_ITEM_LEN);
  if (!text) return;

  const last = await prisma.checklistItem.findFirst({
    where: { checklistId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  await prisma.checklistItem.create({
    data: { checklistId, text, position: (last?.position ?? -1) + 1 },
  });
  revalidatePath(projectPath(checklist.projectId));
}

export async function deleteChecklistItemAction(itemId: string) {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const item = await ownedItem(itemId, organizationId);
  if (!item) return;

  await prisma.checklistItem.delete({ where: { id: item.id } });
  revalidatePath(projectPath(item.checklist.projectId));
}
