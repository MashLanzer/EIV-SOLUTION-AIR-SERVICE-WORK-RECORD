-- Stripe billing linkage per company (Fase B).
ALTER TABLE "Organization" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "Organization" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);

CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");
