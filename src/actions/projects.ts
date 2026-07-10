"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { projectSchema } from "@/lib/validations";

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

  const project = await prisma.project.create({
    data: {
      organizationId,
      name,
      address: address ? address : null,
      status,
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
    select: { id: true },
  });
  if (!owned) return { error: "Project not found" };

  const { name, address, status } = parsed.data;
  await prisma.project.update({
    where: { id: projectId },
    data: { name, address: address ? address : null, status },
  });

  revalidatePath("/admin/projects");
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}?saved=1`);
}

export async function deleteProjectAction(projectId: string) {
  const session = await requireAdmin();
  const organizationId = requireOrgId(session);
  // Records keep their data; their projectId is nulled by the FK.
  await prisma.project.deleteMany({ where: { id: projectId, organizationId } });
  revalidatePath("/admin/projects");
  redirect("/admin/projects");
}
