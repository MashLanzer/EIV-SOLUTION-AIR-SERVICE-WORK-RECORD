-- Jobsite photos stored in Vercel Blob (object storage), not base64 in
-- Postgres. Each photo belongs to a Project, optionally to a work record,
-- and records GPS + who/when for a CompanyCam-style feed. Org-scoped.

CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "workRecordId" TEXT,
    "url" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "takenById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Photo_organizationId_idx" ON "Photo"("organizationId");
CREATE INDEX "Photo_projectId_idx" ON "Photo"("projectId");
CREATE INDEX "Photo_workRecordId_idx" ON "Photo"("workRecordId");

ALTER TABLE "Photo" ADD CONSTRAINT "Photo_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_workRecordId_fkey"
    FOREIGN KEY ("workRecordId") REFERENCES "WorkRecord"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_takenById_fkey"
    FOREIGN KEY ("takenById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
