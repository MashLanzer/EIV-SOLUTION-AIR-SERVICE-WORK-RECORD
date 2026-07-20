-- Auto-categorization rules: a vendor keyword maps a new, uncategorized expense
-- to a category.
CREATE TABLE "ExpenseRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExpenseRule_organizationId_idx" ON "ExpenseRule"("organizationId");
CREATE INDEX "ExpenseRule_categoryId_idx" ON "ExpenseRule"("categoryId");

ALTER TABLE "ExpenseRule" ADD CONSTRAINT "ExpenseRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseRule" ADD CONSTRAINT "ExpenseRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
