import { describe, expect, it } from "vitest";

import { detectExpenseAnomalies, matchExpenseRule, type ExpenseLike } from "./expenseRules";

describe("matchExpenseRule", () => {
  const rules = [
    { keyword: "shell", categoryId: "fuel" },
    { keyword: "home depot", categoryId: "materials" },
  ];

  it("matches the first keyword contained in the vendor, case-insensitively", () => {
    expect(matchExpenseRule("Shell Gas #42", rules)).toBe("fuel");
    expect(matchExpenseRule("THE HOME DEPOT", rules)).toBe("materials");
  });

  it("returns null when nothing matches or the vendor is blank", () => {
    expect(matchExpenseRule("Acme Rentals", rules)).toBeNull();
    expect(matchExpenseRule("   ", rules)).toBeNull();
  });
});

function exp(over: Partial<ExpenseLike> & { id: string }): ExpenseLike {
  return { vendor: "V", amount: 100, date: "2026-07-01", categoryId: "c1", ...over };
}

describe("detectExpenseAnomalies", () => {
  it("flags exact duplicates (vendor + amount + day)", () => {
    const flags = detectExpenseAnomalies([
      exp({ id: "a", vendor: "Shell", amount: 50, date: "2026-07-10" }),
      exp({ id: "b", vendor: "shell", amount: 50, date: "2026-07-10T09:00:00Z" }),
      exp({ id: "c", vendor: "Shell", amount: 50, date: "2026-07-11" }),
    ]);
    expect(flags.get("a")).toBe("duplicate");
    expect(flags.get("b")).toBe("duplicate");
    expect(flags.has("c")).toBe(false);
  });

  it("flags an outlier far above its category average once there's enough data", () => {
    const flags = detectExpenseAnomalies([
      exp({ id: "1", amount: 100 }),
      exp({ id: "2", amount: 120 }),
      exp({ id: "3", amount: 90 }),
      exp({ id: "4", amount: 900 }),
    ]);
    expect(flags.get("4")).toBe("high");
    expect(flags.has("1")).toBe(false);
  });

  it("does not flag outliers without enough samples", () => {
    const flags = detectExpenseAnomalies([
      exp({ id: "1", amount: 100 }),
      exp({ id: "2", amount: 900 }),
    ]);
    expect(flags.size).toBe(0);
  });

  it("prefers duplicate over high", () => {
    const flags = detectExpenseAnomalies([
      exp({ id: "1", amount: 100 }),
      exp({ id: "2", amount: 100 }),
      exp({ id: "3", amount: 100 }),
      exp({ id: "big1", vendor: "Z", amount: 900, date: "2026-07-05" }),
      exp({ id: "big2", vendor: "Z", amount: 900, date: "2026-07-05" }),
    ]);
    expect(flags.get("big1")).toBe("duplicate");
    expect(flags.get("big2")).toBe("duplicate");
  });
});
