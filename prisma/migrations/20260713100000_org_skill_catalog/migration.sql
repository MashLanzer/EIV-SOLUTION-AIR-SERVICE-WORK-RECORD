-- The org's admin-curated skill catalog: the suggestion source for the profile
-- skill input and the job required-skill field. Workers still store their own
-- skills as free-text UserSkill rows.
CREATE TABLE "OrgSkill" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgSkill_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrgSkill_organizationId_idx" ON "OrgSkill"("organizationId");
CREATE UNIQUE INDEX "OrgSkill_organizationId_name_key" ON "OrgSkill"("organizationId", "name");

ALTER TABLE "OrgSkill" ADD CONSTRAINT "OrgSkill_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
