"use client";

import { useEffect } from "react";

import { markActivitySeen } from "@/components/activity/activity-seen";

// Rendered on the activity page: opening the feed marks everything up to now as
// seen, which clears the header bell's unread dot. Runs once on mount.
export function MarkActivitySeen() {
  useEffect(() => {
    markActivitySeen();
  }, []);
  return null;
}
