import { describe, expect, it } from "vitest";

import {
  ALL_PERMISSION_KEYS,
  DEFAULT_POSITIONS,
  PERMISSIONS,
  accessLevelForLegacyRole,
  hasPermission,
  isPermissionKey,
  permissionsForLegacyRole,
} from "@/lib/permissions";
import { effectiveAccess } from "@/lib/positions";

describe("permissions catalog", () => {
  it("has unique permission keys", () => {
    const keys = PERMISSIONS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("recognises real keys and rejects fake ones", () => {
    expect(isPermissionKey("invoices.manage")).toBe(true);
    expect(isPermissionKey("nope.nope")).toBe(false);
  });

  it("hasPermission checks membership", () => {
    expect(hasPermission(["records.review"], "records.review")).toBe(true);
    expect(hasPermission(["records.review"], "settings.manage")).toBe(false);
  });
});

describe("default positions mirror the legacy roles", () => {
  it("admin gets every permission and the office app", () => {
    expect(accessLevelForLegacyRole("ADMIN")).toBe("ADMIN");
    expect(permissionsForLegacyRole("ADMIN")).toEqual(ALL_PERMISSION_KEYS);
  });

  it("supervisor can review + see reports, nothing else", () => {
    expect(accessLevelForLegacyRole("SUPERVISOR")).toBe("ADMIN");
    expect(permissionsForLegacyRole("SUPERVISOR").sort()).toEqual(
      ["records.review", "reports.view"].sort()
    );
    expect(permissionsForLegacyRole("SUPERVISOR")).not.toContain("workers.manage");
  });

  it("worker gets the field app and no office permissions", () => {
    expect(accessLevelForLegacyRole("WORKER")).toBe("WORKER");
    expect(permissionsForLegacyRole("WORKER")).toEqual([]);
  });

  it("every default position's permissions are valid keys", () => {
    for (const pos of DEFAULT_POSITIONS) {
      for (const key of pos.permissions) {
        expect(isPermissionKey(key)).toBe(true);
      }
    }
  });
});

describe("effectiveAccess", () => {
  it("uses the assigned position when present", () => {
    const eff = effectiveAccess({
      role: "WORKER",
      position: { accessLevel: "ADMIN", permissions: ["invoices.manage"] },
    });
    expect(eff.accessLevel).toBe("ADMIN");
    expect(eff.permissions).toEqual(["invoices.manage"]);
  });

  it("falls back to the legacy role when there's no position", () => {
    const eff = effectiveAccess({ role: "SUPERVISOR", position: null });
    expect(eff.accessLevel).toBe("ADMIN");
    expect(eff.permissions.sort()).toEqual(["records.review", "reports.view"].sort());
  });
});
