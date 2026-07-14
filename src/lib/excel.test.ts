import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { buildUtilizationWorkbook } from "@/lib/excel";
import type { UtilizationReport } from "@/lib/utilization";

function report(overrides: Partial<UtilizationReport> = {}): UtilizationReport {
  return {
    from: new Date("2026-01-05T00:00:00.000Z"),
    to: new Date("2026-01-12T00:00:00.000Z"),
    period: "week",
    group: "person",
    rows: [
      { id: "u1", name: "Alex", plannedHours: 40, loggedHours: 30 },
      { id: "u2", name: "Sam", plannedHours: 0, loggedHours: 5 },
    ],
    totals: { plannedHours: 40, loggedHours: 35 },
    trend: [],
    ...overrides,
  };
}

async function readBack(buffer: ArrayBuffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.getWorksheet("Utilization");
  if (!sheet) throw new Error("Utilization sheet missing");
  return sheet;
}

describe("buildUtilizationWorkbook", () => {
  it("writes a header row, each data row and a grand-total row", async () => {
    const buffer = await buildUtilizationWorkbook(report(), { group: "person" });
    const sheet = await readBack(buffer as ArrayBuffer);

    // header + 2 rows + grand total
    expect(sheet.rowCount).toBe(4);
    expect(sheet.getRow(1).getCell(1).value).toBe("Person");
    expect(sheet.getRow(2).getCell(1).value).toBe("Alex");
    expect(sheet.getRow(2).getCell(2).value).toBe(40);
    expect(sheet.getRow(2).getCell(3).value).toBe(30);
    // 30/40 = 0.75, stored as a fraction with a % number format
    expect(sheet.getRow(2).getCell(4).value).toBeCloseTo(0.75, 5);
    expect(sheet.getColumn(4).numFmt).toBe("0%");

    const total = sheet.getRow(4);
    expect(total.getCell(1).value).toBe("Grand Total");
    expect(total.getCell(2).value).toBe(40);
    expect(total.getCell(4).value).toBeCloseTo(0.875, 5); // 35/40
  });

  it("shows an em dash when no hours were planned", async () => {
    const buffer = await buildUtilizationWorkbook(report(), { group: "person" });
    const sheet = await readBack(buffer as ArrayBuffer);
    // Sam: planned 0 -> utilization is not a number
    expect(sheet.getRow(3).getCell(1).value).toBe("Sam");
    expect(sheet.getRow(3).getCell(4).value).toBe("—");
  });

  it("uses the team header and the no-team label in team view", async () => {
    const teamReport = report({
      group: "team",
      rows: [{ id: "__none__", name: "__none__", plannedHours: 10, loggedHours: 8 }],
      totals: { plannedHours: 10, loggedHours: 8 },
    });
    const buffer = await buildUtilizationWorkbook(teamReport, {
      group: "team",
      noTeamLabel: "Sin equipo",
    });
    const sheet = await readBack(buffer as ArrayBuffer);

    expect(sheet.getRow(1).getCell(1).value).toBe("Team");
    expect(sheet.getRow(2).getCell(1).value).toBe("Sin equipo");
  });
});
