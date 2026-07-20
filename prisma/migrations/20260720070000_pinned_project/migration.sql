-- A user's pinned projects, surfaced as a quick-access strip on their home.
CREATE TABLE "PinnedProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinnedProject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PinnedProject_userId_projectId_key" ON "PinnedProject"("userId", "projectId");
CREATE INDEX "PinnedProject_userId_idx" ON "PinnedProject"("userId");

ALTER TABLE "PinnedProject" ADD CONSTRAINT "PinnedProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PinnedProject" ADD CONSTRAINT "PinnedProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
