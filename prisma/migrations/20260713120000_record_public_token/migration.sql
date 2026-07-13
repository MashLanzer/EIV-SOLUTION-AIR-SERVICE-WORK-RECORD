-- Unguessable token for the public customer receipt. Null = not shared.
ALTER TABLE "WorkRecord" ADD COLUMN "publicToken" TEXT;
CREATE UNIQUE INDEX "WorkRecord_publicToken_key" ON "WorkRecord"("publicToken");
