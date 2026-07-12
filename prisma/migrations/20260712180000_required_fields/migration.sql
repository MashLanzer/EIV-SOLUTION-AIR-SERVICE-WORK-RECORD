-- Configurable required-field policies for work records.
ALTER TABLE "Organization" ADD COLUMN "requireHelper" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "requireCustomerSignature" BOOLEAN NOT NULL DEFAULT true;
