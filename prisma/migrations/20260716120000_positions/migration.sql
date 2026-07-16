-- Per-company job positions (roles + permissions). AccessLevel is the hard app
-- gate (office vs field); granular capabilities live in Position.permissions as
-- a text[] of keys from src/lib/permissions.ts. User.role still gates the app;
-- a Position refines what a user can do inside it.

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('ADMIN', 'WORKER');

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'WORKER',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "systemKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Position_organizationId_idx" ON "Position"("organizationId");
CREATE UNIQUE INDEX "Position_organizationId_name_key" ON "Position"("organizationId", "name");
CREATE UNIQUE INDEX "Position_organizationId_systemKey_key" ON "Position"("organizationId", "systemKey");

-- AlterTable: link a user to an optional position
ALTER TABLE "User" ADD COLUMN "positionId" TEXT;
CREATE INDEX "User_positionId_idx" ON "User"("positionId");

-- Foreign keys
ALTER TABLE "Position" ADD CONSTRAINT "Position_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_positionId_fkey"
  FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;
