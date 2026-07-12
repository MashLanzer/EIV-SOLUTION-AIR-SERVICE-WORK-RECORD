-- Currency symbol shown before money amounts (defaults to "$").
ALTER TABLE "Organization" ADD COLUMN "currencySymbol" TEXT NOT NULL DEFAULT '$';
