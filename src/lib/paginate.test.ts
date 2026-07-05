import { describe, expect, it } from "vitest";

import { pageCount, paginationArgs, parsePage, PAGE_SIZE } from "@/lib/paginate";

describe("parsePage", () => {
  it("parses a valid page number", () => {
    expect(parsePage("3")).toBe(3);
  });

  it("defaults to 1 for missing, non-numeric, zero, or negative input", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("1.5")).toBe(1);
  });

  it("takes the first value from an array", () => {
    expect(parsePage(["4", "5"])).toBe(4);
  });
});

describe("paginationArgs", () => {
  it("computes skip/take for a given page", () => {
    expect(paginationArgs(1)).toEqual({ skip: 0, take: PAGE_SIZE });
    expect(paginationArgs(3)).toEqual({ skip: 2 * PAGE_SIZE, take: PAGE_SIZE });
  });

  it("honors a custom page size", () => {
    expect(paginationArgs(2, 10)).toEqual({ skip: 10, take: 10 });
  });
});

describe("pageCount", () => {
  it("rounds up to the nearest page", () => {
    expect(pageCount(PAGE_SIZE + 1)).toBe(2);
    expect(pageCount(PAGE_SIZE)).toBe(1);
  });

  it("is never less than 1, even for zero records", () => {
    expect(pageCount(0)).toBe(1);
  });
});
