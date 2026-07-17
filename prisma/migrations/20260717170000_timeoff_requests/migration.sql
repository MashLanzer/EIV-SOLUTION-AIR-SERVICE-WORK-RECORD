-- Worker-requested time off with office approval.
-- CreateEnum
CREATE TYPE "TimeOffStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- AlterTable: existing rows were entered by the office, so they stay APPROVED.
ALTER TABLE "TimeOff"
  ADD COLUMN "status" "TimeOffStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "TimeOff_organizationId_status_idx" ON "TimeOff"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "TimeOff"
  ADD CONSTRAINT "TimeOff_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
