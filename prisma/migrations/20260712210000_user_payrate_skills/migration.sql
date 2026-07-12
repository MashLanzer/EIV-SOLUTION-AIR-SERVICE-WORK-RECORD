-- Add payRate to User and create UserSkill model.
ALTER TABLE "User" ADD COLUMN "payRate" DECIMAL(10, 2);

CREATE TABLE "UserSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserSkill_userId_name_key" ON "UserSkill"("userId", "name");
CREATE INDEX "UserSkill_userId_idx" ON "UserSkill"("userId");

ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
