-- Add storedSignature to User for saved installer signature.
ALTER TABLE "User" ADD COLUMN "storedSignature" TEXT;
