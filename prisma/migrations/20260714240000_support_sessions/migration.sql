-- Persisted platform support (impersonation) sessions: enables server-side
-- expiry, an active-sessions list, force-end, and notifying the company.
CREATE TYPE "SupportMode" AS ENUM ('FULL', 'READ_ONLY');

CREATE TABLE "ImpersonationSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "mode" "SupportMode" NOT NULL DEFAULT 'FULL',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "ImpersonationSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImpersonationSession_organizationId_idx" ON "ImpersonationSession"("organizationId");
CREATE INDEX "ImpersonationSession_endedAt_expiresAt_idx" ON "ImpersonationSession"("endedAt", "expiresAt");

ALTER TABLE "ImpersonationSession" ADD CONSTRAINT "ImpersonationSession_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
