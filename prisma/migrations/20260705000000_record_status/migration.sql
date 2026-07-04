-- Add a review-status workflow to work records. Existing rows predate the
-- workflow, so they are backfilled to APPROVED - only records submitted
-- from now on start as SUBMITTED (pending review).

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('SUBMITTED', 'APPROVED');

-- AddColumn (default makes this safe on a table with existing rows)
ALTER TABLE "WorkRecord" ADD COLUMN "status" "RecordStatus" NOT NULL DEFAULT 'SUBMITTED';

-- Backfill: pre-workflow records are treated as already reviewed
UPDATE "WorkRecord" SET "status" = 'APPROVED';

-- CreateIndex
CREATE INDEX "WorkRecord_status_idx" ON "WorkRecord"("status");
