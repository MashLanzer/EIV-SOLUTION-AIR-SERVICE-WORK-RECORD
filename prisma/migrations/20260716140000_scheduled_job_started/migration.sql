-- Add a "STARTED" lifecycle state to scheduled jobs, sitting between SCHEDULED
-- and EN_ROUTE. The worker acknowledges/kicks off the assignment before heading
-- out, so the office and customer can see the job has been picked up.
-- The full flow is now: SCHEDULED -> STARTED -> EN_ROUTE -> IN_PROGRESS -> DONE
-- (plus CANCELED). Postgres requires new enum values to be added one at a time.
ALTER TYPE "ScheduledJobStatus" ADD VALUE IF NOT EXISTS 'STARTED' BEFORE 'EN_ROUTE';
