-- Track when a scheduled job's pre-job reminder was sent, so the hourly
-- reminder pass (Settings → Scheduling lead time) sends it at most once.
ALTER TABLE "ScheduledJob" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
