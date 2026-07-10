-- Org invite code: a rotatable code a new person enters (after Google
-- sign-in) to join a company as a worker. Nullable so joining-by-code can be
-- turned off. The existing default org gets a generated code so it works
-- right away.

ALTER TABLE "Organization" ADD COLUMN "joinCode" TEXT;

-- Give existing orgs a code (one row today; md5(random) is plenty unique for
-- the backfill, and admins can rotate it later).
UPDATE "Organization"
SET "joinCode" = upper(substr(md5(random()::text), 1, 8))
WHERE "joinCode" IS NULL;

CREATE UNIQUE INDEX "Organization_joinCode_key" ON "Organization"("joinCode");
