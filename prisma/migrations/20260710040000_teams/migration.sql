-- Teams (crews) within a company: members are Users via TeamMembership, and
-- a team can be assigned to projects. All org-scoped.

CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Team_organizationId_idx" ON "Team"("organizationId");

ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "TeamMembership" (
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("teamId", "userId")
);

CREATE INDEX "TeamMembership_userId_idx" ON "TeamMembership"("userId");

ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Projects can be assigned to a team.
ALTER TABLE "Project" ADD COLUMN "teamId" TEXT;

ALTER TABLE "Project" ADD CONSTRAINT "Project_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Project_teamId_idx" ON "Project"("teamId");
