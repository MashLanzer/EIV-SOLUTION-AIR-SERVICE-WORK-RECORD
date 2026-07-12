"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { geocodeAddress } from "@/lib/geocode";
import { projectDetailPaths } from "@/lib/projectAccess";
import { PROJECT_STATUSES, projectSchema } from "@/lib/validations";

export type ProjectFormState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

function parse(formData: FormData) {
  return projectSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") || undefined,
    status: formData.get("status") || "ACTIVE",
  });
}

// The picked team, but only if it belongs to the caller's org.
async function resolveTeamId(
  formData: FormData,
  organizationId: string
): Promise<string | null> {
  const raw = (formData.get("teamId") as string | null)?.trim();
  if (!raw) return null;
  const team = await prisma.team.findFirst({
    where: { id: raw, organizationId },
    select: { id: true },
  });
  return team?.id ?? null;
}

// The picked customer, but only if it belongs to the caller's org.
async function resolveCustomerId(
  formData: FormData,
  organizationId: string
): Promise<string | null> {
  const raw = (formData.get("customerId") as string | null)?.trim();
  if (!raw) return null;
  const customer = await prisma.customer.findFirst({
    where: { id: raw, organizationId },
    select: { id: true },
  });
  return customer?.id ?? null;
}

export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { name, address, status } = parsed.data;
  const geo = address ? await geocodeAddress(address) : null;
  const teamId = await resolveTeamId(formData, organizationId);
  const customerId = await resolveCustomerId(formData, organizationId);

  const project = await prisma.project.create({
    data: {
      organizationId,
      name,
      address: address ? address : null,
      latitude: geo?.latitude ?? null,
      longitude: geo?.longitude ?? null,
      status,
      teamId,
      customerId,
    },
    select: { id: true },
  });

  revalidatePath("/admin/projects");
  redirect(`/admin/projects/${project.id}`);
}

export async function updateProjectAction(
  projectId: string,
  _prev: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);

  const parsed = parse(formData);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const owned = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true, address: true, latitude: true },
  });
  if (!owned) return { error: "Project not found" };

  const { name, address, status } = parsed.data;
  // Re-geocode only when the address actually changed (or coords are missing),
  // to avoid hammering the geocoder on every unrelated edit.
  const addressChanged = (owned.address ?? "") !== (address ?? "");
  let coords: { latitude: number | null; longitude: number | null } | undefined;
  if (!address) {
    coords = { latitude: null, longitude: null };
  } else if (addressChanged || owned.latitude == null) {
    const geo = await geocodeAddress(address);
    coords = { latitude: geo?.latitude ?? null, longitude: geo?.longitude ?? null };
  }

  const teamId = await resolveTeamId(formData, organizationId);
  const customerId = await resolveCustomerId(formData, organizationId);
  await prisma.project.update({
    where: { id: projectId },
    data: {
      name,
      address: address ? address : null,
      status,
      teamId,
      customerId,
      ...(coords ?? {}),
    },
  });

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}?saved=1`);
}

// Quick status change from the list card / detail header. Org-scoped
// updateMany so a bad id (or another org's) is a silent no-op, never a leak.
export async function setProjectStatusAction(projectId: string, status: string) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const parsed = z.enum(PROJECT_STATUSES).safeParse(status);
  if (!parsed.success) return;
  await prisma.project.updateMany({
    where: { id: projectId, organizationId },
    data: { status: parsed.data },
  });
  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
}

// Re-run geocoding for a project whose address didn't resolve to a map pin
// (Nominatim miss, earlier rate limit, ...). Returns whether a location was
// found so the caller can tell the admin if it still didn't match.
export async function retryGeocodeAction(
  projectId: string
): Promise<{ ok: boolean; located: boolean }> {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { address: true },
  });
  if (!project?.address) return { ok: false, located: false };

  const geo = await geocodeAddress(project.address);
  await prisma.project.updateMany({
    where: { id: projectId, organizationId },
    data: { latitude: geo?.latitude ?? null, longitude: geo?.longitude ?? null },
  });
  for (const path of projectDetailPaths(projectId)) revalidatePath(path);
  revalidatePath("/admin/projects");
  return { ok: true, located: Boolean(geo) };
}

export async function deleteProjectAction(projectId: string) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  // Records keep their data; their projectId is nulled by the FK.
  await prisma.project.deleteMany({ where: { id: projectId, organizationId } });
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}
