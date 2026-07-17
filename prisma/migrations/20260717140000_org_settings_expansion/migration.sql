-- Organization settings expansion: notifications, scheduling defaults,
-- numbering & documents, and localization. All columns have safe defaults so
-- existing rows keep their prior behaviour.

ALTER TABLE "Organization"
  ADD COLUMN "notifyOnSubmit" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyOnReview" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyReminders" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notifyReplyTo" TEXT,
  ADD COLUMN "defaultJobDurationMinutes" INTEGER NOT NULL DEFAULT 120,
  ADD COLUMN "reminderLeadHours" INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN "weekStartsOn" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "jobNumberPrefix" TEXT,
  ADD COLUMN "pdfFooter" TEXT,
  ADD COLUMN "receiptExpiryDays" INTEGER,
  ADD COLUMN "timeFormat" TEXT NOT NULL DEFAULT '12';
