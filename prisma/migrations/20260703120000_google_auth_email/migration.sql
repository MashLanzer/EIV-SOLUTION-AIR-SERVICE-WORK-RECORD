-- Switch User identity from username/password to Google-authenticated email.
-- Backfill existing rows with a placeholder email (derived from their old
-- unique username) before enforcing NOT NULL/UNIQUE, so this is safe to run
-- against a database that already has rows (e.g. production).

-- AddColumn (nullable first)
ALTER TABLE "User" ADD COLUMN "email" TEXT;

-- Backfill
UPDATE "User" SET "email" = "username" || '@placeholder.local';

-- Enforce NOT NULL now that every row has a value
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- DropColumns (password-based auth is gone)
ALTER TABLE "User" DROP COLUMN "username";
ALTER TABLE "User" DROP COLUMN "passwordHash";
ALTER TABLE "User" DROP COLUMN "mustChangePassword";
