-- One-time codes for the native app handoff: the deep link now carries an
-- opaque code instead of the raw session token, which the app exchanges
-- for the token over HTTPS.

-- CreateTable
CREATE TABLE "NativeHandoffCode" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "cookieName" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NativeHandoffCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NativeHandoffCode_expiresAt_idx" ON "NativeHandoffCode"("expiresAt");
