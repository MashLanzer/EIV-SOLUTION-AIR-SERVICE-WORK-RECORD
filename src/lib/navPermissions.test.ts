import { describe, expect, it } from "vitest";

import { canSeeHref, NAV_PERMISSION } from "@/lib/navPermissions";
import { ALL_PERMISSION_KEYS, isPermissionKey, permissionsForLegacyRole } from "@/lib/permissions";

describe("canSeeHref", () => {
  it("always shows baseline destinations (no permission required)", () => {
    expect(canSeeHref("/admin", [])).toBe(true);
    expect(canSeeHref("/admin/records", [])).toBe(true);
  });

  it("shows a gated destination only with its permission", () => {
    expect(canSeeHref("/admin/workers", [])).toBe(false);
    expect(canSeeHref("/admin/workers", ["workers.manage"])).toBe(true);
  });

  it("treats unknown hrefs as visible (no mapping = baseline)", () => {
    expect(canSeeHref("/admin/whatever", [])).toBe(true);
  });

  it("every mapped permission is a real catalog key", () => {
    for (const req of Object.values(NAV_PERMISSION)) {
      if (req) expect(isPermissionKey(req)).toBe(true);
    }
  });

  it("an owner (all permissions) sees every mapped destination", () => {
    const all = [...ALL_PERMISSION_KEYS];
    for (const href of Object.keys(NAV_PERMISSION)) {
      expect(canSeeHref(href, all)).toBe(true);
    }
  });

  it("a supervisor sees only review + reports among the gated sections", () => {
    const perms = permissionsForLegacyRole("SUPERVISOR");
    expect(canSeeHref("/admin/review", perms)).toBe(true);
    expect(canSeeHref("/admin/reports", perms)).toBe(true);
    expect(canSeeHref("/admin/workers", perms)).toBe(false);
    expect(canSeeHref("/admin/invoices", perms)).toBe(false);
    expect(canSeeHref("/admin/roles", perms)).toBe(false);
  });
});
