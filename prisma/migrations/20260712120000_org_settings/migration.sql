-- Company-wide settings on the organization (admin-editable in Settings).
ALTER TABLE "Organization" ADD COLUMN "defaultLeadPay" DECIMAL(10,2);
ALTER TABLE "Organization" ADD COLUMN "defaultHelperPay" DECIMAL(10,2);
ALTER TABLE "Organization" ADD COLUMN "requirePhoto" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN "companyPhone" TEXT;
ALTER TABLE "Organization" ADD COLUMN "companyAddress" TEXT;
ALTER TABLE "Organization" ADD COLUMN "licenseNumber" TEXT;
