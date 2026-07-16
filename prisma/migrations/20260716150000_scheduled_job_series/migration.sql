-- Recurring scheduled jobs. Occurrences created together as a weekly / biweekly
-- / monthly series share a seriesId; one-off jobs leave it null. Each occurrence
-- stays a fully independent row (own status, edits, linked work record).
ALTER TABLE "ScheduledJob" ADD COLUMN "seriesId" TEXT;
CREATE INDEX "ScheduledJob_seriesId_idx" ON "ScheduledJob"("seriesId");
