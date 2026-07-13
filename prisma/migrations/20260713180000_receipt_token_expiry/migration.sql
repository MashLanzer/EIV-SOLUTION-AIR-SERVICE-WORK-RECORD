-- Optional expiry for the public customer-receipt link.
ALTER TABLE "WorkRecord" ADD COLUMN "publicTokenExpiresAt" TIMESTAMP(3);
