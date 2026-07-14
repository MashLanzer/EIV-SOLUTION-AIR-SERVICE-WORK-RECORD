-- Platform on/off switch for an organization, toggled from the super-admin
-- console. Defaults to active so every existing org keeps working.
ALTER TABLE "Organization" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Organization" ADD COLUMN "suspendedAt" TIMESTAMP(3);
