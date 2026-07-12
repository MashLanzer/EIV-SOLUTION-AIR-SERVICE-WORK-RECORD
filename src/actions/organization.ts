"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { deleteProjectPhoto, uploadCompanyLogo } from "@/lib/blob";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { generateJoinCode } from "@/lib/joinCode";
import { updateOrganizationNameSchema } from "@/lib/validations";

// Rotate the company's invite code (admin only). Anyone holding the old code
// can no longer join with it. Also (re)enables joining-by-code if it was off.
export async function rotateJoinCodeAction() {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { joinCode: generateJoinCode() },
      });
      break;
    } catch {
      // Unique collision on the new code - try another.
    }
  }

  revalidatePath("/admin/settings");
}

// Turn joining-by-code on or off (admin only). Off clears the code entirely so
// no one can join with a link they saved; on mints a fresh code. This is the
// enable/disable half of the invite-code control (rotate handles refresh).
export async function setJoinCodeEnabledAction(enabled: boolean) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  if (!enabled) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { joinCode: null },
    });
    revalidatePath("/admin/settings");
    return;
  }

  // Enabling: only mint a code if there isn't one already, so toggling on when
  // it's already on is a no-op instead of silently rotating.
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { joinCode: true },
  });
  if (org?.joinCode) {
    revalidatePath("/admin/settings");
    return;
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { joinCode: generateJoinCode() },
      });
      break;
    } catch {
      // Unique collision on the new code - try another.
    }
  }
  revalidatePath("/admin/settings");
}

export type OrganizationNameState = { error?: string; ok?: boolean } | undefined;

// Rename the company (admin only). The name is org-scoped and shows on the
// work-record PDF header, so this is a real, visible change.
export async function updateOrganizationNameAction(
  _prev: OrganizationNameState,
  formData: FormData
): Promise<OrganizationNameState> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const parsed = updateOrganizationNameSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { name: parsed.data.name },
  });

  revalidatePath("/admin/settings");
  return { ok: true };
}

// One company text/number field, edited inline in Settings. The InlineEditRow
// always posts its value as `name`; the field is bound by the caller so a
// single action backs every company field. Admin + org-scoped.
export type CompanyField =
  | "phone"
  | "address"
  | "license"
  | "leadPay"
  | "helperPay"
  | "currency";

type CompanyFieldState = { error?: string; ok?: boolean } | undefined;

export async function updateCompanyFieldAction(
  field: CompanyField,
  _prev: CompanyFieldState,
  formData: FormData
): Promise<CompanyFieldState> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const raw = ((formData.get("name") as string | null) ?? "").trim();

  let data: Record<string, unknown>;
  if (field === "phone") data = { companyPhone: raw || null };
  else if (field === "address") data = { companyAddress: raw || null };
  else if (field === "license") data = { licenseNumber: raw || null };
  else if (field === "currency") {
    // Short symbol; empty resets to the default "$" (currency can't be blank).
    const symbol = raw.slice(0, 3) || "$";
    data = { currencySymbol: symbol };
  } else {
    // Pay defaults: blank clears; otherwise a non-negative amount.
    const amount = Number(raw);
    if (raw && (!Number.isFinite(amount) || amount < 0)) {
      return { error: "Enter a valid amount (0 or more)." };
    }
    const value = raw ? amount : null;
    data = field === "leadPay" ? { defaultLeadPay: value } : { defaultHelperPay: value };
  }

  await prisma.organization.update({ where: { id: organizationId }, data });
  revalidatePath("/admin/settings");
  return { ok: true };
}

// Toggle the "a record needs a photo to be submitted" policy (admin only).
export async function setRequirePhotoAction(enabled: boolean) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  await prisma.organization.update({
    where: { id: organizationId },
    data: { requirePhoto: enabled },
  });
  revalidatePath("/admin/settings");
}

// Toggle the "require a helper" policy (admin only).
export async function setRequireHelperAction(enabled: boolean) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  await prisma.organization.update({
    where: { id: organizationId },
    data: { requireHelper: enabled },
  });
  revalidatePath("/admin/settings");
}

// Toggle the "require the customer's signature" policy (admin only).
export async function setRequireCustomerSignatureAction(enabled: boolean) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  await prisma.organization.update({
    where: { id: organizationId },
    data: { requireCustomerSignature: enabled },
  });
  revalidatePath("/admin/settings");
}

// Toggle the "lock approved records" policy (admin only). When on, an approved
// record can't be edited by anyone until it's returned to Needs changes.
export async function setLockApprovedRecordsAction(enabled: boolean) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  await prisma.organization.update({
    where: { id: organizationId },
    data: { lockApprovedRecords: enabled },
  });
  revalidatePath("/admin/settings");
}

export type DefaultNotesState = { error?: string; ok?: boolean } | undefined;

// Set the default "work performed" notes template (admin, org-scoped). Blank
// clears it. Multiline, so it has its own action rather than the single-line
// company-field one.
export async function setDefaultWorkNotesAction(
  _prev: DefaultNotesState,
  formData: FormData
): Promise<DefaultNotesState> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const raw = ((formData.get("notes") as string | null) ?? "").trim();
  await prisma.organization.update({
    where: { id: organizationId },
    data: { defaultWorkNotes: raw || null },
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}

export type LogoState = { error?: string; ok?: boolean } | undefined;

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

// Upload/replace the company logo (admin only). Stores it in Blob and swaps
// the URL on the org, deleting the previous logo best-effort.
export async function updateCompanyLogoAction(
  _prev: LogoState,
  formData: FormData
): Promise<LogoState> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const file = formData.get("logo");
  if (!(file instanceof Blob) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "That file isn't an image." };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { error: "Logo must be 2 MB or smaller." };
  }

  let url: string;
  try {
    url = await uploadCompanyLogo(organizationId, file, file.type);
  } catch {
    return { error: "Image storage isn't configured. Ask your provider to enable it." };
  }

  const prev = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { logoUrl: true },
  });
  await prisma.organization.update({
    where: { id: organizationId },
    data: { logoUrl: url },
  });
  if (prev?.logoUrl) await deleteProjectPhoto(prev.logoUrl);

  revalidatePath("/admin/settings");
  return { ok: true };
}

// Remove the company logo (admin only).
export async function removeCompanyLogoAction() {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { logoUrl: true },
  });
  await prisma.organization.update({
    where: { id: organizationId },
    data: { logoUrl: null },
  });
  if (org?.logoUrl) await deleteProjectPhoto(org.logoUrl);
  revalidatePath("/admin/settings");
}
