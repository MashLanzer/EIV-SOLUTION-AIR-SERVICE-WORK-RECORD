-- Adds an admin "return for changes" path plus approval audit trail.
-- A record can now be sent back to the worker (NEEDS_CHANGES) with a note,
-- and approvals record who approved and when.

-- AlterEnum
-- Postgres requires the new enum value be committed before it can be used,
-- so this migration only adds the value; it is not referenced here.
ALTER TYPE "RecordStatus" ADD VALUE IF NOT EXISTS 'NEEDS_CHANGES';

-- AlterTable
ALTER TABLE "WorkRecord"
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" TEXT;

-- Backfill: existing APPROVED rows predate the audit fields; leave
-- approvedAt/approvedById null (their approval time is unknown).

-- AddForeignKey
ALTER TABLE "WorkRecord"
  ADD CONSTRAINT "WorkRecord_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
