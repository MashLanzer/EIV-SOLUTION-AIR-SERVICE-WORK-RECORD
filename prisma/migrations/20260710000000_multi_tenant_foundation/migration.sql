-- Multi-tenant foundation: introduce Organization (a tenant/company) and
-- attach the existing single-company data to a default org. organizationId
-- is added NULLABLE and backfilled here so it lands safely on live data with
-- no downtime; a later migration makes it required once all rows are set and
-- new rows always carry it.

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- AddColumn (nullable - safe on existing rows)
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "WorkRecord" ADD COLUMN "organizationId" TEXT;

-- Seed the default organization (the current company) and attach all
-- existing rows to it.
INSERT INTO "Organization" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('org_eiv_solution_air', 'EIV Solution Air', 'eiv-solution-air', NOW(), NOW());

UPDATE "User" SET "organizationId" = 'org_eiv_solution_air' WHERE "organizationId" IS NULL;
UPDATE "Customer" SET "organizationId" = 'org_eiv_solution_air' WHERE "organizationId" IS NULL;
UPDATE "WorkRecord" SET "organizationId" = 'org_eiv_solution_air' WHERE "organizationId" IS NULL;

-- AddForeignKey (deleting an org cascades to its data)
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkRecord" ADD CONSTRAINT "WorkRecord_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");
CREATE INDEX "WorkRecord_organizationId_idx" ON "WorkRecord"("organizationId");
