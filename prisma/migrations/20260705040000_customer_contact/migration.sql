-- Optional contact details for saved customers so the admin can call or
-- email them from the customer record.

-- AlterTable
ALTER TABLE "Customer"
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "email" TEXT;
