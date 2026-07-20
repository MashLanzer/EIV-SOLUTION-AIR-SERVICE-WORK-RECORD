"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAuth } from "@/lib/session";

// Toggle a project pin for the signed-in user. Returns the new pinned state, or
// null when the project isn't in the caller's org. Own pins only.
export async function togglePinnedProjectAction(projectId: string): Promise<boolean | null> {
  const session = await requireAuth();
  const organizationId = requireOrgId(session);

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true },
  });
  if (!project) return null;

  const existing = await prisma.pinnedProject.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId: project.id } },
    select: { id: true },
  });

  let pinned: boolean;
  if (existing) {
    await prisma.pinnedProject.delete({ where: { id: existing.id } });
    pinned = false;
  } else {
    await prisma.pinnedProject.create({
      data: { userId: session.user.id, projectId: project.id },
    });
    pinned = true;
  }

  revalidatePath("/records");
  revalidatePath(`/records/projects/${projectId}`);
  return pinned;
}
