import { describe, expect, it, vi } from "vitest";

const findMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: { workRecord: { findMany } },
}));

const { buildPayReport } = await import("@/lib/payReport");

function record(overrides: Partial<Parameters<typeof findMany>[0]> = {}) {
  return {
    leadInstallerName: "Alex",
    helperName: null,
    leadInstallerPay: 100,
    helperPay: null,
    ...overrides,
  };
}

describe("buildPayReport", () => {
  it("only queries this org's APPROVED records", async () => {
    findMany.mockResolvedValueOnce([]);
    await buildPayReport({}, "org-1");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "APPROVED",
          organizationId: "org-1",
        }),
      })
    );
  });

  it("credits the lead installer and, separately, the helper", async () => {
    findMany.mockResolvedValueOnce([
      record({
        leadInstallerName: "Alex",
        leadInstallerPay: 100,
        helperName: "Sam",
        helperPay: 40,
      }),
    ]);
    const report = await buildPayReport({}, "org-1");
    const alex = report.rows.find((r) => r.name === "Alex");
    const sam = report.rows.find((r) => r.name === "Sam");
    expect(alex).toMatchObject({ jobs: 1, leadTotal: 100, total: 100 });
    expect(sam).toMatchObject({ jobs: 1, helperTotal: 40, total: 40 });
  });

  it("folds the same person's lead and helper jobs into one row, case-insensitively", async () => {
    findMany.mockResolvedValueOnce([
      record({ leadInstallerName: "Alex", leadInstallerPay: 100 }),
      record({
        leadInstallerName: "Sam",
        leadInstallerPay: 60,
        helperName: "alex",
        helperPay: 30,
      }),
    ]);
    const report = await buildPayReport({}, "org-1");
    const alex = report.rows.find((r) => r.name === "Alex");
    expect(alex).toMatchObject({ jobs: 2, leadTotal: 100, helperTotal: 30, total: 130 });
  });

  it("ignores a helper name with no helper pay", async () => {
    findMany.mockResolvedValueOnce([
      record({ helperName: "Sam", helperPay: null }),
    ]);
    const report = await buildPayReport({}, "org-1");
    expect(report.rows.find((r) => r.name === "Sam")).toBeUndefined();
  });

  it("sums grand totals across every row", async () => {
    findMany.mockResolvedValueOnce([
      record({ leadInstallerName: "Alex", leadInstallerPay: 100 }),
      record({ leadInstallerName: "Sam", leadInstallerPay: 60 }),
    ]);
    const report = await buildPayReport({}, "org-1");
    expect(report.grand).toMatchObject({ jobs: 2, leadTotal: 160, total: 160 });
    expect(report.recordCount).toBe(2);
  });
});
