"use client";

import { useEffect } from "react";
import type { NotificationCategory } from "@prisma/client";

import { markNotificationsReadAction } from "@/actions/notifications";

// Rendered on a persisted-notification tab: opening it marks that category's
// unread notifications as read, which clears the header bell's badge on the
// next navigation. Runs once per category change.
export function MarkNotificationsRead({ category }: { category: NotificationCategory }) {
  useEffect(() => {
    void markNotificationsReadAction(category);
  }, [category]);
  return null;
}
