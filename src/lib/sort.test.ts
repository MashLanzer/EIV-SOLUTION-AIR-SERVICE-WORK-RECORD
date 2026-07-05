import { describe, expect, it } from "vitest";

import { parseSort } from "@/lib/sort";

const ALLOWED = ["date", "jobNumber", "status"] as const;
const FALLBACK = { sort: "date", dir: "desc" } as const;

describe("parseSort", () => {
  it("accepts an allow-listed column", () => {
    expect(parseSort("jobNumber", "asc", ALLOWED, FALLBACK)).toEqual({
      sort: "jobNumber",
      dir: "asc",
    });
  });

  it("falls back for a column not on the allow-list", () => {
    expect(parseSort("dropTable", "asc", ALLOWED, FALLBACK)).toEqual({
      sort: "date",
      dir: "asc",
    });
  });

  it("falls back for an invalid direction", () => {
    expect(parseSort("status", "sideways", ALLOWED, FALLBACK)).toEqual({
      sort: "status",
      dir: "desc",
    });
  });

  it("takes the first value when given arrays (duplicate query params)", () => {
    expect(parseSort(["jobNumber", "status"], ["asc", "desc"], ALLOWED, FALLBACK)).toEqual({
      sort: "jobNumber",
      dir: "asc",
    });
  });

  it("falls back entirely when both params are missing", () => {
    expect(parseSort(undefined, undefined, ALLOWED, FALLBACK)).toEqual(FALLBACK);
  });
});
