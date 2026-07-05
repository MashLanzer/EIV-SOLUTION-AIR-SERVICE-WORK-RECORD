-- Replace the standalone status index with a composite (status, date) one:
-- the pay report and dashboard both filter on status + a date range, and a
-- leftmost-prefix scan still covers the existing status-only lookups
-- (e.g. the pending-review count).

-- DropIndex
DROP INDEX "WorkRecord_status_idx";

-- CreateIndex
CREATE INDEX "WorkRecord_status_date_idx" ON "WorkRecord"("status", "date");
