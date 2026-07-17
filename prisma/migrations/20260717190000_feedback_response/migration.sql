-- Office reply to a customer's receipt feedback.
ALTER TABLE "WorkRecord"
  ADD COLUMN "feedbackResponse" TEXT,
  ADD COLUMN "feedbackRespondedAt" TIMESTAMP(3);
