-- Optional skill a scheduled job needs, matched against UserSkill names so the
-- scheduler can flag when the assigned worker lacks it. Null = no requirement.
ALTER TABLE "ScheduledJob" ADD COLUMN "requiredSkill" TEXT;
