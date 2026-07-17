"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";

export type FeedbackResponseState = { ok?: boolean; error?: string } | undefined;

const schema = z.object({
  response: z.string().trim().max(1000),
});

// The office replies to (or updates its reply to) a customer's feedback. A
// blank reply clears it. Org-scoped; requires review permission.
export async function respondToFeedbackAction(
  recordId: string,
  _prev: FeedbackResponseState,
  formData: FormData
): Promise<FeedbackResponseState> {
  const session = await requirePermission("records.review");
  const organizationId = requireOrgId(session);

  const parsed = schema.safeParse({ response: formData.get("response") ?? "" });
  if (!parsed.success) return { error: "invalid" };

  const owned = await prisma.workRecord.findFirst({
    where: { id: recordId, organizationId, customerRating: { not: null } },
    select: { id: true },
  });
  if (!owned) return { error: "notfound" };

  const text = parsed.data.response.trim();
  await prisma.workRecord.update({
    where: { id: recordId },
    data: {
      feedbackResponse: text || null,
      feedbackRespondedAt: text ? new Date() : null,
    },
  });

  revalidatePath("/admin/feedback");
  revalidatePath(`/admin/records/${recordId}`);
  return { ok: true };
}
