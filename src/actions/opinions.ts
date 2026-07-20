"use server";

import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getFeedbackOverview, type FeedbackItem } from "@/lib/feedback";

export interface OpinionsSnapshot {
  average: number;
  count: number;
  items: FeedbackItem[];
}

// Recent customer opinions for the header quick-view sheet. Guarded by the same
// capability as the full Feedback page.
export async function getOpinionsAction(): Promise<OpinionsSnapshot> {
  const session = await requirePermission("records.review");
  const organizationId = requireOrgId(session);
  const { summary, items } = await getFeedbackOverview(organizationId);
  return {
    average: summary.average,
    count: summary.count,
    items: items.slice(0, 12),
  };
}
