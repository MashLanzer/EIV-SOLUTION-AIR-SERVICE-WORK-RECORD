-- Unguessable token for the public, read-only financial report at /share/[token].
ALTER TABLE "Organization" ADD COLUMN "reportToken" TEXT;
CREATE UNIQUE INDEX "Organization_reportToken_key" ON "Organization"("reportToken");
