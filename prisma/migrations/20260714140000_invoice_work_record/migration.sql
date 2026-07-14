-- Link an invoice back to the work record it was generated from.
ALTER TABLE "Invoice" ADD COLUMN "workRecordId" TEXT;
CREATE INDEX "Invoice_workRecordId_idx" ON "Invoice"("workRecordId");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "WorkRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
