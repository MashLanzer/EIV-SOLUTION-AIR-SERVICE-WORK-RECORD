-- The job scheduler: a planned visit on the calendar (who goes where, on what
-- day, to do what). Independent of WorkRecord - a ScheduledJob is the plan
-- made ahead of time; when the crew finishes it can be linked to the work
-- record it produced (workRecordId). Org-scoped, assignable to a worker
-- and/or a team, optionally tied to a customer and project.
CREATE TYPE "ScheduledJobStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'DONE', 'CANCELED');

CREATE TABLE "ScheduledJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "scheduledFor" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "status" "ScheduledJobStatus" NOT NULL DEFAULT 'SCHEDULED',
    "assignedToId" TEXT,
    "teamId" TEXT,
    "customerId" TEXT,
    "projectId" TEXT,
    "workRecordId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ScheduledJob_workRecordId_key" ON "ScheduledJob"("workRecordId");
CREATE INDEX "ScheduledJob_organizationId_scheduledFor_idx" ON "ScheduledJob"("organizationId", "scheduledFor");
CREATE INDEX "ScheduledJob_assignedToId_idx" ON "ScheduledJob"("assignedToId");
CREATE INDEX "ScheduledJob_teamId_idx" ON "ScheduledJob"("teamId");
CREATE INDEX "ScheduledJob_customerId_idx" ON "ScheduledJob"("customerId");
CREATE INDEX "ScheduledJob_projectId_idx" ON "ScheduledJob"("projectId");

ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "WorkRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
