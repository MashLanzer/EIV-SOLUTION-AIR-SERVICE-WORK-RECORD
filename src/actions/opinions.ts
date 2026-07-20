"use server";

import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getFeedbackOverview, type FeedbackOverview } from "@/lib/feedback";

// Powers the header Opinions sheet — the full feedback overview (summary,
// per-worker averages and the filtered reviews list), so the sheet is a
// complete stand-in for the feedback page. Guards on the same permission.
export async function getOpinionsAction(
  opts: { rating?: number; needsResponse?: boolean } = {}
): Promise<FeedbackOverview> {
  const session = await requirePermission("records.review");
  const organizationId = requireOrgId(session);
  return getFeedbackOverview(organizationId, opts);
}
