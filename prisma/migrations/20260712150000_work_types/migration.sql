-- Org-managed "type of work" taxonomy (category -> work type). The chosen
-- value is still stored on WorkRecord.typeOfWork as text; these tables only
-- drive the picker, so no change to existing records.
CREATE TABLE "WorkTypeCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkTypeCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkType" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkTypeCategory_organizationId_name_key" ON "WorkTypeCategory"("organizationId", "name");
CREATE INDEX "WorkTypeCategory_organizationId_idx" ON "WorkTypeCategory"("organizationId");
CREATE UNIQUE INDEX "WorkType_categoryId_name_key" ON "WorkType"("categoryId", "name");
CREATE INDEX "WorkType_organizationId_idx" ON "WorkType"("organizationId");
CREATE INDEX "WorkType_categoryId_idx" ON "WorkType"("categoryId");

ALTER TABLE "WorkTypeCategory" ADD CONSTRAINT "WorkTypeCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkType" ADD CONSTRAINT "WorkType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkType" ADD CONSTRAINT "WorkType_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "WorkTypeCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
