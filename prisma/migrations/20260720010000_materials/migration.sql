-- Materials catalog + per-record material lines. The line snapshots name +
-- unit cost so it survives the catalog item being renamed or deleted.

CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Material_organizationId_name_key" ON "Material"("organizationId", "name");
CREATE INDEX "Material_organizationId_idx" ON "Material"("organizationId");

CREATE TABLE "RecordMaterial" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "materialId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordMaterial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecordMaterial_recordId_idx" ON "RecordMaterial"("recordId");
CREATE INDEX "RecordMaterial_materialId_idx" ON "RecordMaterial"("materialId");

ALTER TABLE "Material" ADD CONSTRAINT "Material_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecordMaterial" ADD CONSTRAINT "RecordMaterial_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "WorkRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecordMaterial" ADD CONSTRAINT "RecordMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;
