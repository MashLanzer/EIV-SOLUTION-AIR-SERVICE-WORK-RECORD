-- A reviewer role between WORKER and ADMIN: can approve/return records and see
-- the dashboard/reports, but cannot manage workers, customers, teams, projects
-- or settings.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPERVISOR';
