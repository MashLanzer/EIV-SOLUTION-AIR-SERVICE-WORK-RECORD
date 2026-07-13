-- Scheduler overload threshold: how many jobs in a day flags a worker as
-- overloaded on the calendar. Admin-configurable; defaults to 4.
ALTER TABLE "Organization" ADD COLUMN "scheduleOverloadThreshold" INTEGER NOT NULL DEFAULT 4;
