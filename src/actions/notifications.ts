"use server";

import type { NotificationCategory } from "@prisma/client";

import { requireAuth } from "@/lib/session";
import { markNotificationsRead } from "@/lib/inappNotify";

// Mark the signed-in user's unread notifications as read — all of them, or just
// one tab (category). Called from the notifications screen when it opens, so the
// header bell's unread badge clears. Always scoped to the caller's own id.
export async function markNotificationsReadAction(
  category?: NotificationCategory
): Promise<void> {
  const session = await requireAuth();
  await markNotificationsRead(session.user.id, category);
}
