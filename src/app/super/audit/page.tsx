import { redirect } from "next/navigation";

// Audit folded into the Activity tab (All-activity view). Keep the old path
// working for bookmarks and deep links.
export default function SuperAuditPage() {
  redirect("/super/activity?view=all");
}
