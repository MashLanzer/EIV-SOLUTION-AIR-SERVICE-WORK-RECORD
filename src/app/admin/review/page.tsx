import { ReviewQueue, type QueueRecord } from "@/components/records/ReviewQueue";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { prisma } from "@/lib/prisma";
import { requireOrgId } from "@/lib/orgScope";
import { requirePermission } from "@/lib/authz";
import { getT } from "@/lib/i18n/server";

// A focused inbox for reviewers (admins + supervisors): every record still
// waiting for review, grouped and prioritised by age, with KPIs, filters,
// bulk approve/return, per-card return, photo thumbnails and a quick peek.
// Separate from the full /admin/records list so a supervisor lands straight on
// what needs their attention.
export default async function ReviewQueuePage() {
  const session = await requirePermission("records.review");
  const organizationId = requireOrgId(session);

  const [submitted, returned] = await Promise.all([
    prisma.workRecord.findMany({
      where: { organizationId, status: "SUBMITTED" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        jobNumber: true,
        customerName: true,
        typeOfWork: true,
        createdAt: true,
        submittedBy: { select: { id: true, name: true } },
        _count: { select: { photos: true } },
        // A few thumbnails for the card preview / peek. WorkPhoto.dataUrl is a
        // base64 data URL, so keep the take small to bound the payload.
        photos: {
          take: 6,
          orderBy: { position: "asc" },
          select: { dataUrl: true },
        },
      },
    }),
    // Records the reviewer already sent back that the worker hasn't
    // resubmitted yet - shown as a secondary list so they don't fall through
    // the cracks. updatedAt is when it was last returned.
    prisma.workRecord.findMany({
      where: { organizationId, status: "NEEDS_CHANGES" },
      orderBy: { updatedAt: "asc" },
      select: {
        id: true,
        jobNumber: true,
        customerName: true,
        typeOfWork: true,
        updatedAt: true,
        submittedBy: { select: { id: true, name: true } },
      },
    }),
  ]);

  const submittedQueue: QueueRecord[] = submitted.map((r) => ({
    id: r.id,
    jobNumber: r.jobNumber,
    customerName: r.customerName,
    typeOfWork: r.typeOfWork,
    at: r.createdAt.toISOString(),
    submittedById: r.submittedBy?.id ?? null,
    submittedByName: r.submittedBy?.name ?? null,
    thumbs: r.photos.map((p) => p.dataUrl),
    photoCount: r._count.photos,
  }));

  const returnedQueue: QueueRecord[] = returned.map((r) => ({
    id: r.id,
    jobNumber: r.jobNumber,
    customerName: r.customerName,
    typeOfWork: r.typeOfWork,
    at: r.updatedAt.toISOString(),
    submittedById: r.submittedBy?.id ?? null,
    submittedByName: r.submittedBy?.name ?? null,
  }));

  const dict = await getT();
  const t = dict.reviewQueue;

  return (
    <div className="flex flex-col gap-4">
      <SectionTabs family="overview" />
      <PageHeader title={t.title} description={t.desc} />
      <ReviewQueue submitted={submittedQueue} returned={returnedQueue} />
    </div>
  );
}
