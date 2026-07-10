import { describe, expect, it } from "vitest";

import { buildRecordWhereClause, parseRecordFilterParams } from "@/lib/recordFilters";

describe("parseRecordFilterParams", () => {
  it("drops empty values and keeps provided ones", () => {
    expect(
      parseRecordFilterParams({ jobNumber: "123", customerName: "" })
    ).toEqual({
      dateFrom: undefined,
      dateTo: undefined,
      workerId: undefined,
      customerName: undefined,
      jobNumber: "123",
      status: undefined,
      ids: undefined,
    });
  });

  it("only accepts a known RecordStatus value", () => {
    expect(parseRecordFilterParams({ status: "APPROVED" }).status).toBe(
      "APPROVED"
    );
    expect(parseRecordFilterParams({ status: "DROP TABLE" }).status).toBeUndefined();
  });

  it("normalizes ids to an array and drops it when empty", () => {
    expect(parseRecordFilterParams({ ids: "a" }).ids).toEqual(["a"]);
    expect(parseRecordFilterParams({ ids: ["a", "b"] }).ids).toEqual(["a", "b"]);
    expect(parseRecordFilterParams({}).ids).toBeUndefined();
  });
});

const ORG = "org-1";

describe("buildRecordWhereClause", () => {
  it("scopes the ids branch to the org so a crafted ids list can't cross tenants", () => {
    expect(
      buildRecordWhereClause({ ids: ["a", "b"], jobNumber: "123" }, ORG)
    ).toEqual({ organizationId: ORG, id: { in: ["a", "b"] } });
  });

  it("builds a date range from dateFrom/dateTo", () => {
    const where = buildRecordWhereClause(
      { dateFrom: "2026-01-01", dateTo: "2026-01-31" },
      ORG
    );
    expect(where.organizationId).toBe(ORG);
    expect(where.date).toEqual({
      gte: new Date("2026-01-01"),
      lte: new Date("2026-01-31"),
    });
  });

  it("combines worker, customer, job number, and status filters", () => {
    const where = buildRecordWhereClause(
      {
        workerId: "worker-1",
        customerName: "Acme",
        jobNumber: "42",
        status: "SUBMITTED",
      },
      ORG
    );
    expect(where).toEqual({
      organizationId: ORG,
      submittedById: "worker-1",
      customerName: { contains: "Acme", mode: "insensitive" },
      jobNumber: { contains: "42", mode: "insensitive" },
      status: "SUBMITTED",
    });
  });

  it("always scopes to the org even with no other filters", () => {
    expect(buildRecordWhereClause({}, ORG)).toEqual({ organizationId: ORG });
  });
});
