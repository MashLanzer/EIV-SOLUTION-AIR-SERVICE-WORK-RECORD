-- Per-worker override for the scheduler overload alert. Null means the worker
-- uses the organization's scheduleOverloadThreshold.
ALTER TABLE "User" ADD COLUMN "scheduleOverloadThreshold" INTEGER;
