import { prisma } from "@/lib/prisma";

export interface FeedbackItem {
  recordId: string;
  jobNumber: string;
  customerName: string;
  rating: number;
  feedback: string | null;
  ratedAt: string | null; // ISO
  workerName: string;
  response: string | null;
  respondedAt: string | null; // ISO
}

export interface FeedbackSummary {
  count: number;
  average: number; // 0 when no ratings
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  needsResponse: number; // rated but not yet replied to
}

export interface WorkerRating {
  name: string;
  average: number;
  count: number;
}

export interface FeedbackOverview {
  summary: FeedbackSummary;
  byWorker: WorkerRating[];
  items: FeedbackItem[];
}

// Everything the office feedback page needs: an overall summary across every
// rated record, plus a filtered list of individual reviews. Org-scoped.
export async function getFeedbackOverview(
  organizationId: string,
  opts: { rating?: number; needsResponse?: boolean } = {}
): Promise<FeedbackOverview> {
  const rated = { organizationId, customerRating: { not: null } } as const;

  const [byRating, agg, needsResponse, byWorkerRaw, rows] = await Promise.all([
    prisma.workRecord.groupBy({
      by: ["customerRating"],
      where: rated,
      _count: true,
    }),
    prisma.workRecord.aggregate({
      where: rated,
      _avg: { customerRating: true },
      _count: true,
    }),
    prisma.workRecord.count({
      where: { ...rated, feedbackResponse: null },
    }),
    // Average rating per lead installer — how each worker is treating customers.
    prisma.workRecord.groupBy({
      by: ["leadInstallerName"],
      where: rated,
      _avg: { customerRating: true },
      _count: true,
    }),
    prisma.workRecord.findMany({
      where: {
        ...rated,
        ...(opts.rating ? { customerRating: opts.rating } : {}),
        ...(opts.needsResponse ? { feedbackResponse: null } : {}),
      },
      orderBy: { customerRatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        jobNumber: true,
        customerName: true,
        customerRating: true,
        customerFeedback: true,
        customerRatedAt: true,
        leadInstallerName: true,
        feedbackResponse: true,
        feedbackRespondedAt: true,
      },
    }),
  ]);

  const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of byRating) {
    const r = g.customerRating;
    if (r && r >= 1 && r <= 5) distribution[r as 1 | 2 | 3 | 4 | 5] = g._count;
  }

  const byWorker: WorkerRating[] = byWorkerRaw
    .filter((w) => w.leadInstallerName)
    .map((w) => ({
      name: w.leadInstallerName,
      average: w._avg.customerRating ? Math.round(w._avg.customerRating * 10) / 10 : 0,
      count: w._count,
    }))
    .sort((a, b) => b.average - a.average || b.count - a.count)
    .slice(0, 12);

  return {
    summary: {
      count: agg._count,
      average: agg._avg.customerRating ? Math.round(agg._avg.customerRating * 10) / 10 : 0,
      distribution,
      needsResponse,
    },
    byWorker,
    items: rows.map((r) => ({
      recordId: r.id,
      jobNumber: r.jobNumber,
      customerName: r.customerName,
      rating: r.customerRating ?? 0,
      feedback: r.customerFeedback,
      ratedAt: r.customerRatedAt ? r.customerRatedAt.toISOString() : null,
      workerName: r.leadInstallerName,
      response: r.feedbackResponse,
      respondedAt: r.feedbackRespondedAt ? r.feedbackRespondedAt.toISOString() : null,
    })),
  };
}
