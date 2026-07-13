-- Review history for a work record: each approve/return/(re)submit is one row.
CREATE TYPE "ReviewAction" AS ENUM ('SUBMITTED', 'APPROVED', 'RETURNED', 'RESUBMITTED');

CREATE TABLE "RecordReviewEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" "ReviewAction" NOT NULL,
    "note" TEXT,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecordReviewEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecordReviewEvent_recordId_createdAt_idx" ON "RecordReviewEvent"("recordId", "createdAt");
CREATE INDEX "RecordReviewEvent_organizationId_idx" ON "RecordReviewEvent"("organizationId");

ALTER TABLE "RecordReviewEvent" ADD CONSTRAINT "RecordReviewEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecordReviewEvent" ADD CONSTRAINT "RecordReviewEvent_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "WorkRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecordReviewEvent" ADD CONSTRAINT "RecordReviewEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
