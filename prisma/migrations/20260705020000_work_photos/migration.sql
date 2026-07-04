-- Work photos: up to 4 compressed JPEGs per record, stored in their own
-- table so record list queries never fetch the image payloads.

-- CreateTable
CREATE TABLE "WorkPhoto" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkPhoto_recordId_idx" ON "WorkPhoto"("recordId");

-- AddForeignKey
ALTER TABLE "WorkPhoto" ADD CONSTRAINT "WorkPhoto_recordId_fkey"
    FOREIGN KEY ("recordId") REFERENCES "WorkRecord"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
