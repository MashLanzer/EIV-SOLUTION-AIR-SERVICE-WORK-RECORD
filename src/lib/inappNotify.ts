import "server-only";

import type { NotificationCategory } from "@prisma/client";

import { prisma } from "@/lib/prisma";

// Persisted in-app notifications: the bell's inbox. Every email the app sends
// also writes one of these for the recipient (see lib/notifications.ts), so the
// same message shows in-app with the actor and full detail. Writes are
// best-effort — a failure here must never break the action that fired it, just
// like the email path.

export interface NewNotification {
  organizationId: string;
  // Recipients. Duplicates and falsy ids are ignored; empty = no-op.
  userIds: (string | null | undefined)[];
  category: NotificationCategory;
  // Stable kind key (e.g. "record_approved") used by the UI for icon/tone.
  type: string;
  title: string;
  body?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  href?: string | null;
}

// Fan one message out to every recipient. Best-effort: swallows errors and
// no-ops when there's no one to notify.
export async function createNotifications(input: NewNotification): Promise<void> {
  const userIds = [...new Set(input.userIds.filter((id): id is string => Boolean(id)))];
  if (userIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        organizationId: input.organizationId,
        userId,
        category: input.category,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        actorId: input.actorId ?? null,
        actorName: input.actorName ?? null,
        href: input.href ?? null,
      })),
    });
  } catch {
    // Notifications are non-critical; never surface a write failure.
  }
}

export interface NotificationView {
  id: string;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string | null;
  actorName: string | null;
  href: string | null;
  read: boolean;
  at: Date;
}

// A recipient's notifications, newest first, optionally narrowed to one tab.
export async function getNotificationFeed(
  userId: string,
  opts?: { category?: NotificationCategory; limit?: number }
): Promise<NotificationView[]> {
  const rows = await prisma.notification.findMany({
    where: { userId, ...(opts?.category ? { category: opts.category } : {}) },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 60,
    select: {
      id: true,
      category: true,
      type: true,
      title: true,
      body: true,
      actorName: true,
      href: true,
      readAt: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    type: r.type,
    title: r.title,
    body: r.body,
    actorName: r.actorName,
    href: r.href,
    read: r.readAt !== null,
    at: r.createdAt,
  }));
}

// How many unread notifications the recipient has (drives the bell badge).
// Capped display is the caller's concern; this returns the true count.
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

// Per-category unread counts, so the notification tabs can each show a dot.
export async function getUnreadByCategory(
  userId: string
): Promise<Record<NotificationCategory, number>> {
  const rows = await prisma.notification.groupBy({
    by: ["category"],
    where: { userId, readAt: null },
    _count: { _all: true },
  });
  const out: Record<NotificationCategory, number> = { PERSONAL: 0, COMPANY: 0, SYSTEM: 0 };
  for (const r of rows) out[r.category] = r._count._all;
  return out;
}

// Mark the recipient's unread notifications as read (all, or one tab). Called
// when they open the bell so the badge clears.
export async function markNotificationsRead(
  userId: string,
  category?: NotificationCategory
): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null, ...(category ? { category } : {}) },
    data: { readAt: new Date() },
  });
}
