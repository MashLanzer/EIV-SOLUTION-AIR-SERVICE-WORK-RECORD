-- Customer satisfaction captured from the public receipt.
ALTER TABLE "WorkRecord" ADD COLUMN "customerRating" INTEGER;
ALTER TABLE "WorkRecord" ADD COLUMN "customerFeedback" TEXT;
ALTER TABLE "WorkRecord" ADD COLUMN "customerRatedAt" TIMESTAMP(3);
