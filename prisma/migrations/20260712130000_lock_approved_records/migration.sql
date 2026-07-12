-- Admin policy: lock approved records for everyone (must reopen to edit).
ALTER TABLE "Organization" ADD COLUMN "lockApprovedRecords" BOOLEAN NOT NULL DEFAULT false;
