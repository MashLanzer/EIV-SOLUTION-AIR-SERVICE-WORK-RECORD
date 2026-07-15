-- Stripe Connect linkage per company: companies connect their own Standard
-- account so customers can pay invoices directly into it (online payments).
ALTER TABLE "Organization" ADD COLUMN "stripeConnectAccountId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "stripeConnectChargesEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "Organization_stripeConnectAccountId_key" ON "Organization"("stripeConnectAccountId");
