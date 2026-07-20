-- Manual revenue fallback for the per-job profitability card (cash work with
-- no invoice). Ignored when a non-void invoice is linked to the record.
ALTER TABLE "WorkRecord" ADD COLUMN "jobValue" DECIMAL(10,2);
