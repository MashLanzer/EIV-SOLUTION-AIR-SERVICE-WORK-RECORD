"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requireAdmin } from "@/lib/session";
import { generateJoinCode } from "@/lib/joinCode";

// Rotate the company's invite code (admin only). Anyone holding the old code
// can no longer join with it.
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
