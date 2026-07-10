import { describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";

// requireOrgId redirects when there's no org; stub next/navigation's redirect
// so we can assert it fires instead of actually navigating.
const redirect = vi.fn(() => {
  throw new Error("REDIRECT");
});
vi.mock("next/navigation", () => ({ redirect }));

const { requireOrgId } = await import("@/lib/orgScope");

function sessionWith(organizationId: string | null): Session {
  return { user: { id: "u1", role: "ADMIN", organizationId } } as Session;
}

describe("requireOrgId", () => {
  it("returns the organization id when the session has one", () => {
    expect(requireOrgId(sessionWith("org-1"))).toBe("org-1");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redirects to onboarding when the session has no organization", () => {
    expect(() => requireOrgId(sessionWith(null))).toThrow("REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/onboarding");
  });
});
