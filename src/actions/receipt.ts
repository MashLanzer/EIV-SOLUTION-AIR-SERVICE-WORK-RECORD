"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { notifyFeedbackReceived } from "@/lib/notifications";

export type RatingState = { ok?: boolean; error?: string } | undefined;

const schema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  feedback: z.string().trim().max(1000).optional(),
});

// Public, token-gated: the customer rates the visit from the receipt page.
// No auth by design — whoever holds the receipt link can leave feedback.
export async function submitReceiptRatingAction(
  token: string,
  _prev: RatingState,
  formData: FormData
): Promise<RatingState> {
  const parsed = schema.safeParse({
    rating: formData.get("rating"),
    feedback: formData.get("feedback") || undefined,
  });
  if (!parsed.success) return { error: "invalid" };

  const record = await prisma.workRecord.findFirst({
    where: { publicToken: token },
    select: { id: true, publicTokenExpiresAt: true },
  });
  if (!record) return { error: "notfound" };
  if (record.publicTokenExpiresAt && record.publicTokenExpiresAt.getTime() < Date.now()) {
    return { error: "expired" };
  }

  await prisma.workRecord.update({
    where: { id: record.id },
    data: {
      customerRating: parsed.data.rating,
      customerFeedback: parsed.data.feedback ?? null,
      customerRatedAt: new Date(),
    },
  });
  // Let the office and the worker who did the job know (best-effort).
  await notifyFeedbackReceived(record.id);
  revalidatePath(`/receipt/${token}`);
  revalidatePath("/admin/feedback");
  revalidatePath(`/admin/records/${record.id}`);
  return { ok: true };
}
