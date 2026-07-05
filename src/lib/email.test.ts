import { describe, expect, it } from "vitest";

import { normalizeEmailForDuplicateCheck } from "@/lib/email";

describe("normalizeEmailForDuplicateCheck", () => {
  it("strips dots from the local part of a gmail address", () => {
    expect(normalizeEmailForDuplicateCheck("j.doe@gmail.com")).toBe(
      normalizeEmailForDuplicateCheck("jdoe@gmail.com")
    );
  });

  it("strips +alias suffixes on gmail", () => {
    expect(normalizeEmailForDuplicateCheck("jdoe+work@gmail.com")).toBe(
      normalizeEmailForDuplicateCheck("jdoe@gmail.com")
    );
  });

  it("folds googlemail.com into the same identity as gmail.com", () => {
    expect(normalizeEmailForDuplicateCheck("j.doe@googlemail.com")).toBe(
      normalizeEmailForDuplicateCheck("jdoe@gmail.com")
    );
  });

  it("is case-insensitive", () => {
    expect(normalizeEmailForDuplicateCheck("Jane.Doe@Gmail.com")).toBe(
      normalizeEmailForDuplicateCheck("janedoe@gmail.com")
    );
  });

  it("leaves non-gmail domains untouched (dots matter elsewhere)", () => {
    expect(normalizeEmailForDuplicateCheck("j.doe@company.com")).toBe(
      "j.doe@company.com"
    );
    expect(normalizeEmailForDuplicateCheck("jdoe@company.com")).toBe(
      "jdoe@company.com"
    );
  });

  it("does not treat two different gmail addresses as duplicates", () => {
    expect(normalizeEmailForDuplicateCheck("jane@gmail.com")).not.toBe(
      normalizeEmailForDuplicateCheck("john@gmail.com")
    );
  });
});
