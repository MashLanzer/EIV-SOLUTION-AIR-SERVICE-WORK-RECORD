import { describe, expect, it } from "vitest";

import { collectionBucket, daysOverdue, isBucketOverdue } from "./collections";

const now = new Date("2026-07-20T12:00:00.000Z");

describe("daysOverdue", () => {
  it("counts whole days past the due date (UTC day boundaries)", () => {
    expect(daysOverdue(new Date("2026-07-10T00:00:00Z"), now)).toBe(10);
    expect(daysOverdue(new Date("2026-07-20T23:00:00Z"), now)).toBe(0); // due today
    expect(daysOverdue(new Date("2026-07-25T00:00:00Z"), now)).toBe(-5); // upcoming
  });

  it("treats a missing due date as not overdue", () => {
    expect(daysOverdue(null, now)).toBe(0);
  });
});

describe("collectionBucket", () => {
  it("buckets by how overdue", () => {
    expect(collectionBucket(90)).toBe("d61plus");
    expect(collectionBucket(61)).toBe("d61plus");
    expect(collectionBucket(60)).toBe("d31_60");
    expect(collectionBucket(31)).toBe("d31_60");
    expect(collectionBucket(30)).toBe("d1_30");
    expect(collectionBucket(1)).toBe("d1_30");
  });

  it("puts due-today and near-future in due_soon, and excludes far-future", () => {
    expect(collectionBucket(0)).toBe("due_soon");
    expect(collectionBucket(-7)).toBe("due_soon");
    expect(collectionBucket(-8)).toBeNull();
  });
});

describe("isBucketOverdue", () => {
  it("marks every bucket but due_soon as overdue", () => {
    expect(isBucketOverdue("d1_30")).toBe(true);
    expect(isBucketOverdue("d61plus")).toBe(true);
    expect(isBucketOverdue("due_soon")).toBe(false);
  });
});
