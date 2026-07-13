-- Audit log of worker role changes (who changed whom, from/to, when).
CREATE TABLE "RoleChangeEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "targetId" TEXT,
    "targetName" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "fromRole" "Role" NOT NULL,
    "toRole" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoleChangeEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RoleChangeEvent_organizationId_createdAt_idx" ON "RoleChangeEvent"("organizationId", "createdAt");

ALTER TABLE "RoleChangeEvent" ADD CONSTRAINT "RoleChangeEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoleChangeEvent" ADD CONSTRAINT "RoleChangeEvent_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoleChangeEvent" ADD CONSTRAINT "RoleChangeEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
