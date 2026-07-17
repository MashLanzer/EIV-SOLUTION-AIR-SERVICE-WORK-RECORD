-- Per-org IANA time zone, used to convert a scheduled job's wall-clock start
-- into a real instant so reminders fire at the right local time. "UTC" keeps
-- the previous behaviour.
ALTER TABLE "Organization" ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'UTC';
