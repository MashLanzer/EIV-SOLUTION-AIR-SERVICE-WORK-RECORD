-- Per-company module toggles (feature flags), managed from the super-admin
-- console. Default on so every existing org keeps all modules.
ALTER TABLE "Organization" ADD COLUMN "featureInvoicing" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "featureEstimates" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "featurePortal" BOOLEAN NOT NULL DEFAULT true;
