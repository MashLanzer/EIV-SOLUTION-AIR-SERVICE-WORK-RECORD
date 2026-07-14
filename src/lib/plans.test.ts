import { describe, expect, it } from "vitest";

import { PLANS, planLabel, planMaxUsers } from "./plans";

describe("plans", () => {
  it("labels a null (legacy) plan distinctly", () => {
    expect(planLabel(null)).toBe("Legacy");
    expect(planLabel("FREE")).toBe(PLANS.FREE.name);
    expect(planLabel("PRO")).toBe(PLANS.PRO.name);
  });

  it("treats a legacy (null) plan as unlimited users", () => {
    expect(planMaxUsers(null)).toBeNull();
  });

  it("returns the plan's user cap", () => {
    expect(planMaxUsers("FREE")).toBe(PLANS.FREE.maxUsers);
    expect(planMaxUsers("PRO")).toBeNull(); // Pro is unlimited
  });

  it("Free excludes the paid modules, Pro includes them", () => {
    expect(PLANS.FREE.modules.invoicing).toBe(false);
    expect(PLANS.PRO.modules.invoicing).toBe(true);
    expect(PLANS.PRO.modules.portal).toBe(true);
  });
});
