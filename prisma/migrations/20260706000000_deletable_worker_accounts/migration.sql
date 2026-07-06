-- Make a work record's submitter optional and detach (rather than block)
-- on user deletion, so an admin can permanently delete a deactivated
-- worker's account without losing that worker's submitted records.
-- Records keep their denormalized installer names; only the FK is nulled,
-- exactly like Customer deletion already does for customerId.
ALTER TABLE "WorkRecord" DROP CONSTRAINT "WorkRecord_submittedById_fkey";

ALTER TABLE "WorkRecord" ALTER COLUMN "submittedById" DROP NOT NULL;

ALTER TABLE "WorkRecord" ADD CONSTRAINT "WorkRecord_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
