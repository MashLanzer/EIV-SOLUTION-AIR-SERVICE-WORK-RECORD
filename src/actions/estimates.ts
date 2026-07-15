"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { EstimateStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { ESTIMATE_STATUSES, formatEstimateNumber } from "@/lib/estimates";
import { formatInvoiceNumber } from "@/lib/invoices";
import { logAudit } from "@/lib/audit";
import { appUrl, emailConfigured, emailLayout, sendEmail } from "@/lib/email";
import type { EmailSendResult } from "@/actions/invoices";

export type EstimateFormState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: z.coerce.number().min(0).max(1_000_000),
  unitPrice: z.coerce.number().min(-1_000_000).max(1_000_000),
});

const estimateSchema = z.object({
  customerId: z.string().trim().optional(),
  projectId: z.string().trim().optional(),
  customerName: z.string().trim().min(1, "Customer name is required").max(200),
  customerAddress: z.string().trim().max(300).optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an issue date"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  taxRate: z.coerce.number().min(0).max(100),
  notes: z.string().trim().max(2000).optional(),
  items: z.array(lineItemSchema).max(200),
});

function parseForm(formData: FormData) {
  let items: unknown = [];
  const raw = formData.get("items");
  if (typeof raw === "string" && raw) {
    try {
      items = JSON.parse(raw);
    } catch {
      items = [];
    }
  }
  return estimateSchema.safeParse({
    customerId: formData.get("customerId") || undefined,
    projectId: formData.get("projectId") || undefined,
    customerName: formData.get("customerName"),
    customerAddress: formData.get("customerAddress") || undefined,
    issueDate: formData.get("issueDate"),
    dueDate: formData.get("dueDate") || undefined,
    taxRate: formData.get("taxRate"),
    notes: formData.get("notes") || undefined,
    items,
  });
}

const utcDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function ownedId(
  model: "customer" | "project",
  id: string | undefined,
  organizationId: string
): Promise<string | null> {
  if (!id) return null;
  const row =
    model === "customer"
      ? await prisma.customer.findFirst({ where: { id, organizationId }, select: { id: true } })
      : await prisma.project.findFirst({ where: { id, organizationId }, select: { id: true } });
  return row ? id : null;
}

const itemRows = (items: z.infer<typeof lineItemSchema>[]) =>
  items.map((it, i) => ({
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    position: i,
  }));

function actor(session: { user: { id: string; name?: string | null } }) {
  return { id: session.user.id, name: session.user.name };
}

// Allocate the next per-org estimate number (max+1), retrying on collision.
async function allocateEstimate(
  organizationId: string,
  data: Omit<Prisma.EstimateUncheckedCreateInput, "number" | "organizationId">
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const agg = await prisma.estimate.aggregate({
      where: { organizationId },
      _max: { number: true },
    });
    const number = (agg._max.number ?? 0) + 1;
    try {
      const created = await prisma.estimate.create({
        data: { ...data, number, organizationId },
        select: { id: true },
      });
      return created.id;
    } catch (e) {
      const err = e as Prisma.PrismaClientKnownRequestError;
      if (err?.code === "P2002" && attempt < 4) continue;
      throw e;
    }
  }
  throw new Error("Could not allocate an estimate number");
}

export async function createEstimateAction(
  _prev: EstimateFormState,
  formData: FormData
): Promise<EstimateFormState> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const data = parsed.data;
  const newId = await allocateEstimate(organizationId, {
    customerId: await ownedId("customer", data.customerId, organizationId),
    projectId: await ownedId("project", data.projectId, organizationId),
    customerName: data.customerName,
    customerAddress: data.customerAddress ?? null,
    issueDate: utcDate(data.issueDate),
    expiryDate: data.dueDate ? utcDate(data.dueDate) : null,
    taxRate: data.taxRate,
    notes: data.notes ?? null,
    createdById: session.user.id,
    lineItems: { create: itemRows(data.items) },
  });
  await logAudit({
    organizationId,
    actor: actor(session),
    action: "estimate.create",
    entityType: "estimate",
    entityId: newId,
    summary: `Created an estimate for ${data.customerName}`,
  });
  revalidatePath("/admin/estimates");
  redirect(`/admin/estimates/${newId}`);
}

export async function updateEstimateAction(
  estimateId: string,
  _prev: EstimateFormState,
  formData: FormData
): Promise<EstimateFormState> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const owned = await prisma.estimate.findFirst({
    where: { id: estimateId, organizationId },
    select: { id: true, status: true, convertedInvoiceId: true },
  });
  if (!owned) return { error: "Estimate not found." };
  if (owned.convertedInvoiceId) return { error: "This estimate was converted to an invoice and is read-only." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const data = parsed.data;
  await prisma.$transaction([
    prisma.estimateLineItem.deleteMany({ where: { estimateId } }),
    prisma.estimate.update({
      where: { id: estimateId },
      data: {
        customerId: await ownedId("customer", data.customerId, organizationId),
        projectId: await ownedId("project", data.projectId, organizationId),
        customerName: data.customerName,
        customerAddress: data.customerAddress ?? null,
        issueDate: utcDate(data.issueDate),
        expiryDate: data.dueDate ? utcDate(data.dueDate) : null,
        taxRate: data.taxRate,
        notes: data.notes ?? null,
        lineItems: { create: itemRows(data.items) },
      },
    }),
  ]);
  revalidatePath("/admin/estimates");
  revalidatePath(`/admin/estimates/${estimateId}`);
  redirect(`/admin/estimates/${estimateId}`);
}

export async function setEstimateStatusAction(estimateId: string, status: EstimateStatus) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  if (!ESTIMATE_STATUSES.includes(status)) return;
  const owned = await prisma.estimate.findFirst({
    where: { id: estimateId, organizationId },
    select: { id: true, number: true },
  });
  if (!owned) return;
  await prisma.estimate.update({
    where: { id: estimateId },
    data: { status, acceptedAt: status === "ACCEPTED" ? new Date() : null },
  });
  await logAudit({
    organizationId,
    actor: actor(session),
    action: `estimate.${status.toLowerCase()}`,
    entityType: "estimate",
    entityId: estimateId,
    summary: `Set ${formatEstimateNumber(owned.number)} to ${status}`,
  });
  revalidatePath("/admin/estimates");
  revalidatePath(`/admin/estimates/${estimateId}`);
}

export async function deleteEstimateAction(estimateId: string) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const owned = await prisma.estimate.findFirst({
    where: { id: estimateId, organizationId },
    select: { id: true, number: true },
  });
  if (!owned) return;
  await prisma.estimate.delete({ where: { id: estimateId } });
  await logAudit({
    organizationId,
    actor: actor(session),
    action: "estimate.delete",
    entityType: "estimate",
    entityId: estimateId,
    summary: `Deleted ${formatEstimateNumber(owned.number)}`,
  });
  revalidatePath("/admin/estimates");
  redirect("/admin/estimates");
}

export async function shareEstimateAction(estimateId: string): Promise<{ token: string } | null> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const est = await prisma.estimate.findFirst({
    where: { id: estimateId, organizationId },
    select: { publicToken: true },
  });
  if (!est) return null;
  const token = est.publicToken ?? `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  await prisma.estimate.update({ where: { id: estimateId }, data: { publicToken: token } });
  revalidatePath(`/admin/estimates/${estimateId}`);
  return { token };
}

// Email the public estimate (accept/decline) link to the customer.
export async function emailEstimateAction(estimateId: string): Promise<EmailSendResult> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  if (!emailConfigured()) return { error: "not_configured" };

  const est = await prisma.estimate.findFirst({
    where: { id: estimateId, organizationId },
    select: {
      number: true,
      publicToken: true,
      customer: { select: { email: true } },
      organization: { select: { name: true } },
    },
  });
  if (!est) return { error: "not_found" };
  const email = est.customer?.email?.trim();
  if (!email) return { error: "no_email" };

  const token =
    est.publicToken ?? `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  if (!est.publicToken) {
    await prisma.estimate.update({ where: { id: estimateId }, data: { publicToken: token } });
  }

  const num = formatEstimateNumber(est.number);
  const orgName = est.organization?.name ?? "";
  await sendEmail({
    to: email,
    subject: `Estimate ${num}${orgName ? ` from ${orgName}` : ""}`,
    html: emailLayout(
      `Estimate ${num}`,
      [`${orgName} sent you an estimate.`, "Review it and accept or decline using the button below."],
      { href: appUrl(`/estimate/${token}`), label: "View estimate" }
    ),
  });

  await logAudit({
    organizationId,
    actor: { id: session.user.id, name: session.user.name },
    action: "estimate.email",
    entityType: "estimate",
    entityId: estimateId,
    summary: `Emailed ${num} to ${email}`,
  });
  revalidatePath(`/admin/estimates/${estimateId}`);
  return { ok: true };
}

export async function unshareEstimateAction(estimateId: string) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const est = await prisma.estimate.findFirst({
    where: { id: estimateId, organizationId },
    select: { id: true },
  });
  if (!est) return;
  await prisma.estimate.update({ where: { id: estimateId }, data: { publicToken: null } });
  revalidatePath(`/admin/estimates/${estimateId}`);
}

// Turn an accepted estimate into a draft invoice: copy the customer, project,
// tax rate, notes and line items. Idempotent — a second call jumps to the
// invoice already created.
export async function convertEstimateToInvoiceAction(estimateId: string) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const est = await prisma.estimate.findFirst({
    where: { id: estimateId, organizationId },
    include: { lineItems: { orderBy: { position: "asc" } } },
  });
  if (!est) return;
  if (est.convertedInvoiceId) redirect(`/admin/invoices/${est.convertedInvoiceId}/edit`);

  // Allocate the invoice number with the same collision-retry approach.
  let invoiceId = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const agg = await prisma.invoice.aggregate({ where: { organizationId }, _max: { number: true } });
    const number = (agg._max.number ?? 0) + 1;
    try {
      const inv = await prisma.invoice.create({
        data: {
          number,
          organizationId,
          customerId: est.customerId,
          projectId: est.projectId,
          customerName: est.customerName,
          customerAddress: est.customerAddress,
          issueDate: new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`),
          taxRate: est.taxRate,
          notes: est.notes,
          createdById: session.user.id,
          lineItems: {
            create: est.lineItems.map((li) => ({
              description: li.description,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              position: li.position,
            })),
          },
        },
        select: { id: true, number: true },
      });
      invoiceId = inv.id;
      await prisma.estimate.update({
        where: { id: estimateId },
        data: { convertedInvoiceId: inv.id, status: "ACCEPTED", acceptedAt: est.acceptedAt ?? new Date() },
      });
      await logAudit({
        organizationId,
        actor: actor(session),
        action: "estimate.convert",
        entityType: "estimate",
        entityId: estimateId,
        summary: `Converted ${formatEstimateNumber(est.number)} to ${formatInvoiceNumber(inv.number)}`,
      });
      break;
    } catch (e) {
      const err = e as Prisma.PrismaClientKnownRequestError;
      if (err?.code === "P2002" && attempt < 4) continue;
      throw e;
    }
  }

  revalidatePath("/admin/estimates");
  revalidatePath("/admin/invoices");
  if (invoiceId) redirect(`/admin/invoices/${invoiceId}/edit`);
  redirect(`/admin/estimates/${estimateId}`);
}

// Public, token-gated: the customer accepts or declines from the shared link.
export async function respondToEstimateAction(token: string, accept: boolean) {
  const est = await prisma.estimate.findFirst({
    where: { publicToken: token },
    select: { id: true, status: true },
  });
  if (!est || est.status === "ACCEPTED" || est.status === "DECLINED") return;
  await prisma.estimate.update({
    where: { id: est.id },
    data: {
      status: accept ? "ACCEPTED" : "DECLINED",
      acceptedAt: accept ? new Date() : null,
    },
  });
  revalidatePath(`/estimate/${token}`);
}
