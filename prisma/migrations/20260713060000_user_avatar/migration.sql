-- A user's profile photo URL (Vercel Blob). Null = show initials.
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
