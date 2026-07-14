-- Subscription plan per company. Null = legacy/grandfathered (no plan limits);
-- new companies are created as FREE, and a plan can be assigned from the
-- console (or, later, set via Stripe checkout).
CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');

ALTER TABLE "Organization" ADD COLUMN "plan" "Plan";
