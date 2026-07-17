-- Worker time off (vacation / sick / personal). The scheduler reads these to
-- warn before booking someone who's away and to show "off" on the calendar.
-- Date-only, inclusive on both ends. Org-scoped.
CREATE TABLE "TimeOff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeOff_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TimeOff_organizationId_startDate_idx" ON "TimeOff"("organizationId", "startDate");
CREATE INDEX "TimeOff_userId_idx" ON "TimeOff"("userId");

ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeOff" ADD CONSTRAINT "TimeOff_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
