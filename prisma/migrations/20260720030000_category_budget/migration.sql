-- Optional monthly spend budget per expense category, driving the budgets
-- page's progress bars and over/near-budget alerts.
ALTER TABLE "ExpenseCategory" ADD COLUMN "monthlyBudget" DECIMAL(10,2);
