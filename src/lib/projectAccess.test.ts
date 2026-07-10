import { describe, expect, it } from "vitest";

import { decideProjectAccess } from "@/lib/projectAccess";

describe("decideProjectAccess", () => {
  it("lets admins reach any project regardless of team", () => {
    expect(decideProjectAccess("ADMIN", null, [])).toBe(true);
    expect(decideProjectAccess("ADMIN", "team-1", [])).toBe(true);
  });

  it("lets a worker reach a project on one of their teams", () => {
    expect(decideProjectAccess("WORKER", "team-2", ["team-1", "team-2"])).toBe(true);
  });

  it("blocks a worker from a project on a team they're not on", () => {
    expect(decideProjectAccess("WORKER", "team-9", ["team-1", "team-2"])).toBe(false);
  });

  it("blocks a worker when the project has no team assigned", () => {
    expect(decideProjectAccess("WORKER", null, ["team-1"])).toBe(false);
  });

  it("blocks a worker with no teams", () => {
    expect(decideProjectAccess("WORKER", "team-1", [])).toBe(false);
  });
});
