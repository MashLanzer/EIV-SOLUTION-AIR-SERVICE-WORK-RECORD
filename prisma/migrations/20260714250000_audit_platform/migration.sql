-- Mark platform-owner (super-admin) audit entries so the platform console can
-- filter its own actions across all companies.
ALTER TABLE "AuditEvent" ADD COLUMN "isPlatform" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "AuditEvent_isPlatform_createdAt_idx" ON "AuditEvent"("isPlatform", "createdAt");
