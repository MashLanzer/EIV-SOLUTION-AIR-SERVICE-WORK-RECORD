-- Saved customers: auto-collected from work records so the form can
-- autocomplete repeat customers and the admin can browse visit history.
-- Existing records are backfilled into the new table and linked.

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (case-insensitive uniqueness on name+address; functional, so
-- declared here rather than in the Prisma schema)
CREATE UNIQUE INDEX "Customer_lower_name_address_key"
    ON "Customer" (lower("name"), lower("address"));

CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- AddColumn (nullable - safe on existing rows)
ALTER TABLE "WorkRecord" ADD COLUMN "customerId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkRecord" ADD CONSTRAINT "WorkRecord_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "WorkRecord_customerId_idx" ON "WorkRecord"("customerId");

-- Backfill: one Customer per distinct (case-insensitive) name+address pair,
-- keeping the casing of the most recent record
INSERT INTO "Customer" ("id", "name", "address", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, wr."customerName", wr."customerAddress", NOW(), NOW()
FROM (
    SELECT DISTINCT ON (lower("customerName"), lower("customerAddress"))
        "customerName", "customerAddress"
    FROM "WorkRecord"
    ORDER BY lower("customerName"), lower("customerAddress"), "createdAt" DESC
) wr;

-- Link every record to its customer
UPDATE "WorkRecord" wr
SET "customerId" = c."id"
FROM "Customer" c
WHERE lower(wr."customerName") = lower(c."name")
  AND lower(wr."customerAddress") = lower(c."address");
