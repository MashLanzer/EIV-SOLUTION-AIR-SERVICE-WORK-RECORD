-- Worker mileage log + an optional org reimbursement rate per mile.
ALTER TABLE "Organization" ADD COLUMN "mileageRate" DECIMAL(6,2);

CREATE TABLE "MileageEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "miles" DECIMAL(8,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MileageEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MileageEntry_organizationId_idx" ON "MileageEntry"("organizationId");
CREATE INDEX "MileageEntry_userId_date_idx" ON "MileageEntry"("userId", "date");

ALTER TABLE "MileageEntry" ADD CONSTRAINT "MileageEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MileageEntry" ADD CONSTRAINT "MileageEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
