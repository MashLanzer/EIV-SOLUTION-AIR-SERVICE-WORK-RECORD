"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { InvoiceStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { INVOICE_STATUSES, formatInvoiceNumber } from "@/lib/invoices";
import { logAudit } from "@/lib/audit";
import { appUrl, emailConfigured, emailLayout, sendEmail } from "@/lib/email";
import { getT } from "@/lib/i18n/server";

export type EmailSendResult = { ok: true } | { error: "no_email" | "not_configured" | "not_found" };

function freshToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

// Email the public invoice link straight to the customer via the configured
// provider. Ensures a share token first. Best-effort transport, but we report
// clearly if there's no customer email or no provider configured.
export async function emailInvoiceAction(invoiceId: string): Promise<EmailSendResult> {
  const session = await requirePermission("invoices.manage");
  const organizationId = requireOrgId(session);
  if (!emailConfigured()) return { error: "not_configured" };

  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: {
      number: true,
      publicToken: true,
      customer: { select: { email: true } },
      organization: { select: { name: true } },
    },
  });
  if (!inv) return { error: "not_found" };
  const email = inv.customer?.email?.trim();
  if (!email) return { error: "no_email" };

  const token = inv.publicToken ?? freshToken();
  if (!inv.publicToken) {
    await prisma.invoice.update({ where: { id: invoiceId }, data: { publicToken: token } });
  }

  const num = formatInvoiceNumber(inv.number);
  const orgName = inv.organization?.name ?? "";
  await sendEmail({
    to: email,
    subject: `Invoice ${num}${orgName ? ` from ${orgName}` : ""}`,
    html: emailLayout(
      `Invoice ${num}`,
      [`${orgName} sent you an invoice.`, "You can view it online using the button below."],
      { href: appUrl(`/invoice/${token}`), label: "View invoice" }
    ),
  });

  await logAudit({
    organizationId,
    actor: auditActor(session),
    action: "invoice.email",
    entityType: "invoice",
    entityId: invoiceId,
    summary: `Emailed ${num} to ${email}`,
  });
  revalidatePath(`/admin/invoices/${invoiceId}`);
  return { ok: true };
}

function auditActor(session: { user: { id: string; name?: string | null } }) {
  return { id: session.user.id, name: session.user.name };
}

export type InvoiceFormState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

const lineItemSchema = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: z.coerce.number().min(0).max(1_000_000),
  unitPrice: z.coerce.number().min(-1_000_000).max(1_000_000),
});

const invoiceSchema = z.object({
  customerId: z.string().trim().optional(),
  projectId: z.string().trim().optional(),
  customerName: z.string().trim().min(1, "Customer name is required").max(200),
  customerAddress: z.string().trim().max(300).optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick an issue date"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
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
  return invoiceSchema.safeParse({
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

function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

// A saved customer must belong to the caller's org; otherwise drop the link
// but keep the typed snapshot so cross-org ids can never attach.
async function resolveCustomerId(
  id: string | undefined,
  organizationId: string
): Promise<string | null> {
  if (!id) return null;
  const owned = await prisma.customer.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  return owned ? id : null;
}

async function resolveProjectId(
  id: string | undefined,
  organizationId: string
): Promise<string | null> {
  if (!id) return null;
  const owned = await prisma.project.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
  return owned ? id : null;
}

function itemRows(items: z.infer<typeof lineItemSchema>[]) {
  return items.map((it, i) => ({
    description: it.description,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    position: i,
  }));
}

// Create an invoice with the next per-org number. The unique (org, number)
// constraint guards against a race; retry a few times on collision.
async function allocateInvoice(
  organizationId: string,
  data: Omit<Prisma.InvoiceUncheckedCreateInput, "number" | "organizationId">
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const agg = await prisma.invoice.aggregate({
      where: { organizationId },
      _max: { number: true },
    });
    const number = (agg._max.number ?? 0) + 1;
    try {
      const created = await prisma.invoice.create({
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
  throw new Error("Could not allocate an invoice number");
}

export async function createInvoiceAction(
  _prev: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const session = await requirePermission("invoices.manage");
  const organizationId = requireOrgId(session);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const data = parsed.data;
  const customerId = await resolveCustomerId(data.customerId, organizationId);
  const projectId = await resolveProjectId(data.projectId, organizationId);

  const newId = await allocateInvoice(organizationId, {
    customerId,
    projectId,
    customerName: data.customerName,
    customerAddress: data.customerAddress ?? null,
    issueDate: utcDate(data.issueDate),
    dueDate: data.dueDate ? utcDate(data.dueDate) : null,
    taxRate: data.taxRate,
    notes: data.notes ?? null,
    createdById: session.user.id,
    lineItems: { create: itemRows(data.items) },
  });

  await logAudit({
    organizationId,
    actor: auditActor(session),
    action: "invoice.create",
    entityType: "invoice",
    entityId: newId,
    summary: `Created an invoice for ${data.customerName}`,
  });
  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices/${newId}`);
}

// Generate a draft invoice pre-filled from an approved work record: the
// customer + project links, a labour line priced at the record's pay total,
// and today's date. If the record was already invoiced, jump to that invoice
// instead of creating a duplicate. Lands on the editor so the admin can
// price/adjust before sending.
export async function createInvoiceFromRecordAction(recordId: string) {
  const session = await requirePermission("invoices.manage");
  const organizationId = requireOrgId(session);

  const record = await prisma.workRecord.findFirst({
    where: { id: recordId, organizationId },
    select: {
      id: true,
      jobNumber: true,
      typeOfWork: true,
      customerName: true,
      customerAddress: true,
      customerId: true,
      projectId: true,
      leadInstallerPay: true,
      helperPay: true,
    },
  });
  if (!record) return;

  const existing = await prisma.invoice.findFirst({
    where: { organizationId, workRecordId: record.id },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) redirect(`/admin/invoices/${existing.id}/edit`);

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { defaultTaxRate: true },
  });
  const t = (await getT()).invoices;
  const labour = Number(record.leadInstallerPay) + Number(record.helperPay ?? 0);
  const description = t.laborLine
    .replace("{type}", record.typeOfWork)
    .replace("{job}", record.jobNumber);

  const newId = await allocateInvoice(organizationId, {
    customerId: record.customerId,
    projectId: record.projectId,
    workRecordId: record.id,
    customerName: record.customerName,
    customerAddress: record.customerAddress,
    issueDate: new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`),
    taxRate: org?.defaultTaxRate != null ? Number(org.defaultTaxRate) : 0,
    createdById: session.user.id,
    lineItems: {
      create: [{ description, quantity: 1, unitPrice: labour, position: 0 }],
    },
  });

  await logAudit({
    organizationId,
    actor: auditActor(session),
    action: "invoice.create",
    entityType: "invoice",
    entityId: newId,
    summary: `Created an invoice from job ${record.jobNumber}`,
  });
  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices/${newId}/edit`);
}

// Re-issue a similar invoice: copy the customer, project, tax, notes and line
// items into a fresh DRAFT (new number, issued today, no due date, not linked
// to a work record) and open it for editing. Works even from a paid/void
// invoice, so recurring or repeat billing is one tap.
export async function duplicateInvoiceAction(invoiceId: string) {
  const session = await requirePermission("invoices.manage");
  const organizationId = requireOrgId(session);
  const src = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    include: { lineItems: { orderBy: { position: "asc" } } },
  });
  if (!src) redirect("/admin/invoices");

  const today = new Date();
  const issueDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const newId = await allocateInvoice(organizationId, {
    customerId: src.customerId,
    projectId: src.projectId,
    customerName: src.customerName,
    customerAddress: src.customerAddress,
    issueDate,
    dueDate: null,
    taxRate: src.taxRate,
    notes: src.notes,
    createdById: session.user.id,
    lineItems: {
      create: src.lineItems.map((li, i) => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        position: i,
      })),
    },
  });
  await logAudit({
    organizationId,
    actor: auditActor(session),
    action: "invoice.duplicate",
    entityType: "invoice",
    entityId: newId,
    summary: `Duplicated ${formatInvoiceNumber(src.number)}`,
  });
  revalidatePath("/admin/invoices");
  redirect(`/admin/invoices/${newId}/edit`);
}

export async function updateInvoiceAction(
  invoiceId: string,
  _prev: InvoiceFormState,
  formData: FormData
): Promise<InvoiceFormState> {
  const session = await requirePermission("invoices.manage");
  const organizationId = requireOrgId(session);

  const owned = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { id: true, status: true },
  });
  if (!owned) return { error: "Invoice not found." };
  if (owned.status === "PAID" || owned.status === "VOID") {
    return { error: "Paid or void invoices can't be edited. Reopen it first." };
  }

  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const data = parsed.data;
  const customerId = await resolveCustomerId(data.customerId, organizationId);
  const projectId = await resolveProjectId(data.projectId, organizationId);

  // Replace the line items wholesale (simplest consistent editor model).
  await prisma.$transaction([
    prisma.invoiceLineItem.deleteMany({ where: { invoiceId } }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        customerId,
        projectId,
        customerName: data.customerName,
        customerAddress: data.customerAddress ?? null,
        issueDate: utcDate(data.issueDate),
        dueDate: data.dueDate ? utcDate(data.dueDate) : null,
        taxRate: data.taxRate,
        notes: data.notes ?? null,
        lineItems: { create: itemRows(data.items) },
      },
    }),
  ]);

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  redirect(`/admin/invoices/${invoiceId}`);
}

export async function setInvoiceStatusAction(invoiceId: string, status: InvoiceStatus) {
  const session = await requirePermission("invoices.manage");
  const organizationId = requireOrgId(session);
  if (!INVOICE_STATUSES.includes(status)) return;

  const owned = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { id: true, number: true },
  });
  if (!owned) return;

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      // Stamp/clear the paid time so it reflects the current status.
      paidAt: status === "PAID" ? new Date() : null,
    },
  });

  await logAudit({
    organizationId,
    actor: auditActor(session),
    action: `invoice.${status.toLowerCase()}`,
    entityType: "invoice",
    entityId: invoiceId,
    summary: `Set ${formatInvoiceNumber(owned.number)} to ${status}`,
  });
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

// Turn on the public customer link: mint an unguessable token (idempotent).
export async function shareInvoiceAction(
  invoiceId: string
): Promise<{ token: string } | null> {
  const session = await requirePermission("invoices.manage");
  const organizationId = requireOrgId(session);
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { publicToken: true },
  });
  if (!inv) return null;
  const token =
    inv.publicToken ?? `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  await prisma.invoice.update({ where: { id: invoiceId }, data: { publicToken: token } });
  revalidatePath(`/admin/invoices/${invoiceId}`);
  return { token };
}

// Stop sharing: clear the token so the public link 404s.
export async function unshareInvoiceAction(invoiceId: string) {
  const session = await requirePermission("invoices.manage");
  const organizationId = requireOrgId(session);
  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { id: true },
  });
  if (!inv) return;
  await prisma.invoice.update({ where: { id: invoiceId }, data: { publicToken: null } });
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function deleteInvoiceAction(invoiceId: string) {
  const session = await requirePermission("invoices.manage");
  const organizationId = requireOrgId(session);

  const owned = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { id: true, number: true },
  });
  if (!owned) return;

  await prisma.invoice.delete({ where: { id: invoiceId } });
  await logAudit({
    organizationId,
    actor: auditActor(session),
    action: "invoice.delete",
    entityType: "invoice",
    entityId: invoiceId,
    summary: `Deleted ${formatInvoiceNumber(owned.number)}`,
  });
  revalidatePath("/admin/invoices");
  redirect("/admin/invoices");
}
