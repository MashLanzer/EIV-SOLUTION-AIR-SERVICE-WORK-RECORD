import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeEmailForDuplicateCheck, sendEmail } from "@/lib/email";

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

describe("sendEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("no-ops (never calls fetch or throws) when RESEND_API_KEY is unset", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("RESEND_FROM", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(
      sendEmail({ to: "a@b.com", subject: "hi", html: "<p>hi</p>" })
    ).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("skips when there are no recipients even if configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_FROM", "from@eiv.com");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await sendEmail({ to: [], subject: "hi", html: "<p>hi</p>" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
